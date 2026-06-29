const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/Liz/.gemini/antigravity-cli/brain/bc29b485-4be1-4718-abc9-bc763754a3e7/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes("activeTab === 'testrunner' &&")) {
      try {
        const obj = JSON.parse(line);
        if (obj.content && obj.content.includes("{activeTab === 'testrunner' &&")) {
          let text = obj.content;
          let start = text.indexOf("{activeTab === 'testrunner' &&");
          let end = text.indexOf("{activeTab === 'api' &&", start + 10);
          if (end === -1) end = start + 3000;
          let block = text.substring(start, end);
          fs.writeFileSync('C:/Users/Liz/Desktop/LugarTrabajos/contadorpalabras/testrunner_backup.txt', block);
          console.log('Found and saved to testrunner_backup.txt');
          return;
        }
      } catch (e) {}
    }
  }
}

processLineByLine();
