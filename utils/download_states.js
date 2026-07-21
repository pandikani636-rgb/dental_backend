const fs = require('fs');
const https = require('https');
const path = require('path');

const filePath = path.join(__dirname, 'states-and-districts.json');
const file = fs.createWriteStream(filePath);

console.log("Downloading to:", filePath);

https.get("https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json", function (response) {
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
    fs.unlinkSync(filePath);
});
