const fs = require('fs');
const https = require('https');
const path = require('path');

const filePath = path.join(__dirname, 'taluks.json');
const file = fs.createWriteStream(filePath);

console.log("Downloading to:", filePath);

// The gist URL
const url = "https://gist.githubusercontent.com/Keshava11/975da614d3b66023304543789b7fa345/raw/districts_block_map.json";

https.get(url, function (response) {
    if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log("Download completed successfully.");
        });
    } else {
        console.error("Download failed. Status Code:", response.statusCode);
        file.close();
        fs.unlinkSync(filePath); // Delete incomplete file
    }
}).on('error', function (err) {
    console.error("Error downloading file:", err.message);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
});
