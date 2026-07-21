const axios = require('axios');

async function testCitiesAPI() {
    try {
        console.log("Testing Cities API for 'Virudhunagar' district...\n");

        const response = await axios.get(
            'https://api.postalpincode.in/postoffice/Virudhunagar'
        );

        if (response.data && response.data[0]) {
            console.log("Status:", response.data[0].Status);
            console.log("Message:", response.data[0].Message);

            if (response.data[0].PostOffice) {
                const postOffices = response.data[0].PostOffice;
                console.log("\nTotal Post Offices:", postOffices.length);

                // Extract unique names
                const uniqueNames = [...new Set(postOffices.map(po => po.Name))].sort();
                console.log("\nUnique City/Taluk Names:", uniqueNames.length);
                console.log("\nFirst 10 cities:");
                uniqueNames.slice(0, 10).forEach((name, i) => {
                    console.log(`${i + 1}. ${name}`);
                });

                // Check if Rajapalayam and Srivilliputhur are in the list
                console.log("\n--- Checking for expected taluks ---");
                console.log("Rajapalayam found:", uniqueNames.some(n => n.toLowerCase().includes('rajapalayam')));
                console.log("Srivilliputhur found:", uniqueNames.some(n => n.toLowerCase().includes('srivilliputhur')));
            }
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testCitiesAPI();
