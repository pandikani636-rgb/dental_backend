const axios = require('axios');

async function testPostalAPI() {
    try {
        console.log("Testing Postal API for 'Virudhunagar' district...\n");

        const { data } = await axios.get(
            'https://api.postalpincode.in/postoffice/Virudhunagar'
        );

        if (data && data[0] && data[0].Status === "Success") {
            console.log("✅ API Response Status:", data[0].Status);
            console.log("Total Post Offices:", data[0].PostOffice.length);

            // Show first 3 post offices with all fields
            console.log("\n📋 Sample Post Office Data:");
            data[0].PostOffice.slice(0, 3).forEach((po, i) => {
                console.log(`\n${i + 1}. Post Office:`);
                console.log("   Name:", po.Name);
                console.log("   Block:", po.Block);
                console.log("   District:", po.District);
                console.log("   State:", po.State);
            });

            // Extract unique Block values
            const blocks = [...new Set(
                data[0].PostOffice
                    .map(po => po.Block)
                    .filter(block => block && block.trim() !== "")
            )].sort();

            console.log("\n🏙️ Unique Blocks (Cities/Taluks):");
            console.log("Total:", blocks.length);
            blocks.forEach((block, i) => {
                console.log(`${i + 1}. ${block}`);
            });

        } else {
            console.log("❌ API returned error or no data");
            console.log("Response:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

testPostalAPI();
