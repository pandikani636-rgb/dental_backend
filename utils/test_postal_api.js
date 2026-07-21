const https = require('https');

function fetch(url) {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Response from ${url}:`);
            try {
                const json = JSON.parse(data);
                if (json && json[0]) {
                    console.log("Status:", json[0].Status);
                    console.log("Message:", json[0].Message);
                    if (json[0].PostOffice) {
                        console.log("Post Offices found:", json[0].PostOffice.length);
                        console.log("Sample:", json[0].PostOffice.slice(0, 3));
                    }
                } else {
                    console.log("Raw:", data.substring(0, 200));
                }
            } catch (e) {
                console.log("Error parsing JSON:", e.message);
                console.log("Raw:", data.substring(0, 200));
            }
        });
    }).on('error', (err) => {
        console.error("Error:", err.message);
    });
}

// Test District Search via Post Office Name endpoint (often works for city names too)
fetch('https://api.postalpincode.in/postoffice/Chennai');
fetch('https://api.postalpincode.in/postoffice/Thanjavur');
