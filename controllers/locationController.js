const axios = require('axios');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');

const fs = require('fs');
const path = require('path');

exports.getStates = asyncErrorHandler(async (req, res, next) => {
    try {
        const dataPath = path.join(__dirname, '../utils/states-and-districts.json');
        const fileData = fs.readFileSync(dataPath, 'utf8');
        const json = JSON.parse(fileData);

        // Map states to have numeric ID (index + 1)
        const states = json.states.map((s, index) => ({
            state_id: index + 1,
            state_name: s.state
        }));

        res.status(200).json({
            success: true,
            states: states
        });
    } catch (error) {
        console.error("Error reading states-and-districts.json:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load states data"
        });
    }
});

exports.getDistricts = asyncErrorHandler(async (req, res, next) => {
    try {
        const { stateId } = req.params;
        const id = parseInt(stateId);

        const dataPath = path.join(__dirname, '../utils/states-and-districts.json');
        const fileData = fs.readFileSync(dataPath, 'utf8');
        const json = JSON.parse(fileData);

        // Find state by index (ID - 1)
        const stateData = json.states[id - 1];

        if (stateData) {
            const districts = stateData.districts.map((d, index) => ({
                district_id: `${id}_${index}`,
                district_name: d
            }));

            return res.status(200).json({
                success: true,
                districts: districts
            });
        }

        res.status(404).json({
            success: false,
            message: "Districts not found for this state ID"
        });

    } catch (error) {
        console.error("Error in getDistricts:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch districts"
        });
    }
});

exports.getCitiesByDistrict = asyncErrorHandler(async (req, res, next) => {
    const { districtName } = req.params;

    console.log("\n=== FETCHING CITIES FOR DISTRICT:", districtName, "===");

    try {
        const { data } = await axios.get(
            `https://api.postalpincode.in/postoffice/${encodeURIComponent(districtName)}`
        );

        console.log("API Response Status:", data && data[0] ? data[0].Status : "No data");

        if (data && data[0] && data[0].Status === "Success") {
            const postOffices = data[0].PostOffice;
            console.log("Total Post Offices:", postOffices.length);

            // Log first post office structure
            if (postOffices.length > 0) {
                console.log("Sample Post Office Data:", JSON.stringify(postOffices[0], null, 2));
            }

            // Try to extract cities from Block field first (most reliable for taluks)
            let cities = [...new Set(
                postOffices
                    .map(po => po.Block)
                    .filter(block => block && block.trim() !== "" && block.toLowerCase() !== "na")
            )];
            console.log("Cities from Block field:", cities.length, cities.slice(0, 5));

            // If no blocks found, try Division field
            if (cities.length === 0) {
                cities = [...new Set(
                    postOffices
                        .map(po => po.Division)
                        .filter(div => div && div.trim() !== "" && div.toLowerCase() !== "na")
                )];
                console.log("Cities from Division field:", cities.length, cities.slice(0, 5));
            }

            // If still no data, try Region field
            if (cities.length === 0) {
                cities = [...new Set(
                    postOffices
                        .map(po => po.Region)
                        .filter(region => region && region.trim() !== "" && region.toLowerCase() !== "na")
                )];
                console.log("Cities from Region field:", cities.length, cities.slice(0, 5));
            }

            // If still no data, use Name field but filter out common post office suffixes
            if (cities.length === 0) {
                cities = [...new Set(
                    postOffices
                        .map(po => po.Name.replace(/\s+(B\.O|S\.O|H\.O)$/i, '').trim())
                        .filter(name => name && name.trim() !== "")
                )];
                console.log("Cities from Name field (cleaned):", cities.length, cities.slice(0, 5));
            }

            cities = cities.sort();

            console.log(`✅ FINAL: ${cities.length} cities found from Postal API for ${districtName}`);
            console.log("Cities:", cities);

            return res.status(200).json({
                success: true,
                cities: cities.map((city, index) => ({
                    city_id: `${districtName}_${index}`,
                    city_name: city
                }))
            });
        }

        console.log("❌ Postal API returned error or no data for", districtName);
        res.status(404).json({
            success: false,
            message: `No cities found for ${districtName}. The Postal API may not have data for this district.`
        });
    } catch (error) {
        console.error("❌ Error fetching cities:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch cities from Postal API"
        });
    }
});

exports.getPincodeByCity = asyncErrorHandler(async (req, res, next) => {
    const { cityName } = req.params;

    console.log(`\n=== FETCHING PINCODE FOR CITY: ${cityName} ===`);

    try {
        const { data } = await axios.get(
            `https://api.postalpincode.in/postoffice/${encodeURIComponent(cityName)}`
        );

        if (data && data[0] && data[0].Status === "Success") {
            const postOffices = data[0].PostOffice;

            // Try to find a Head Office (H.O) or Sub Office (S.O) which usually represents the main city pincode
            // Sort by likely importance: H.O > S.O > B.O

            // Helper to score closeness of match
            const getScore = (po) => {
                let score = 0;
                const name = po.Name.toLowerCase();
                const city = cityName.toLowerCase();

                // Exact match gets highest priority
                if (name === city) score += 100;

                // Head Offices are usually the main code
                if (po.BranchType === 'Head Post Office') score += 50;
                if (po.BranchType === 'Sub Post Office') score += 20;

                // If the PO Name specifically starts with the city name
                if (name.startsWith(city)) score += 10;

                return score;
            };

            const bestMatch = postOffices.sort((a, b) => getScore(b) - getScore(a))[0];

            if (bestMatch) {
                console.log(`✅ Found Pincode: ${bestMatch.Pincode} for ${bestMatch.Name} (${bestMatch.BranchType})`);
                return res.status(200).json({
                    success: true,
                    pincode: bestMatch.Pincode
                });
            }
        }

        res.status(404).json({
            success: false,
            message: "Pincode not found for this city"
        });

    } catch (error) {
        console.error("❌ Error fetching pincode:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch pincode"
        });
    }
});

exports.getLocationByPincode = asyncErrorHandler(async (req, res, next) => {
    const { pincode } = req.params;

    console.log(`\n=== FETCHING LOCATION FOR PINCODE: ${pincode} ===`);

    try {
        const { data } = await axios.get(
            `https://api.postalpincode.in/pincode/${pincode}`
        );

        if (data && data[0] && data[0].Status === "Success") {
            const postOffices = data[0].PostOffice;

            // Find the best post office (prefer Sub Post Office or Head Post Office)
            const bestMatch = postOffices.find(po => po.BranchType === 'Sub Post Office') || 
                             postOffices.find(po => po.BranchType === 'Head Post Office') || 
                             postOffices[0];

            // Get all unique cities (Blocks) from all post offices
            const allCities = [...new Set(
                postOffices
                    .map(po => po.Block || po.Division || po.Name)
                    .filter(city => city && city.trim() !== "")
            )];

            console.log(`✅ Found Location:`, bestMatch);
            console.log(`✅ All Cities:`, allCities);
            
            return res.status(200).json({
                success: true,
                location: {
                    state: bestMatch.State,
                    district: bestMatch.District,
                    city: bestMatch.Block || bestMatch.Division || bestMatch.Name,
                    allCities: allCities,
                    pincode: bestMatch.Pincode
                }
            });
        }

        res.status(404).json({
            success: false,
            message: "Invalid Pincode"
        });

    } catch (error) {
        console.error("❌ Error fetching location:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch location"
        });
    }
});
