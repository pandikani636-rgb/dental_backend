const axios = require('axios');

async function testMahabubabad() {
    try {
        console.log("Testing Postal API for 'Mahabubabad' district...\n");

        const { data } = await axios.get(
            'https://api.postalpincode.in/postoffice/Mahabubabad'
        );

        console.log("Full API Response:");
        console.log(JSON.stringify(data, null, 2));

        if (data && data[0]) {
            console.log("\n=== SUMMARY ===");
            console.log("Status:", data[0].Status);
            console.log("Message:", data[0].Message);

            if (data[0].PostOffice && data[0].PostOffice.length > 0) {
                console.log("Total Post Offices:", data[0].PostOffice.length);
                console.log("\nFirst Post Office:");
                console.log(JSON.stringify(data[0].PostOffice[0], null, 2));

                // Check what fields are available
                const firstPO = data[0].PostOffice[0];
                console.log("\n=== Available Fields ===");
                console.log("Name:", firstPO.Name);
                console.log("Block:", firstPO.Block);
                console.log("Division:", firstPO.Division);
                console.log("Region:", firstPO.Region);
                console.log("District:", firstPO.District);
                console.log("State:", firstPO.State);
            }
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testMahabubabad();
