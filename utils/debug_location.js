const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'states-and-districts.json');

try {
    console.log("Reading file from:", dataPath);
    const fileData = fs.readFileSync(dataPath, 'utf8');
    console.log("File read successfully. Length:", fileData.length);

    const json = JSON.parse(fileData);
    console.log("JSON parsed. Number of states:", json.states.length);

    // Test: Find "Tamil Nadu"
    const stateName = "Tamil Nadu";
    const stateIndex = json.states.findIndex(s => s.state === stateName);

    if (stateIndex !== -1) {
        console.log(`Found ${stateName} at index ${stateIndex} (ID: ${stateIndex + 1})`);
        const stateData = json.states[stateIndex];
        console.log(`Districts in ${stateName}:`, stateData.districts.length);
        console.log("Sample districts:", stateData.districts.slice(0, 5));
    } else {
        console.error(`${stateName} not found!`);
        // List all state names to check spelling
        console.log("Available states:", json.states.map(s => s.state).join(", "));
    }

} catch (error) {
    console.error("Error:", error.message);
}
