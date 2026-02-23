const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  console.log("Fetching Magdalena Andersson's motions...");
  // First get Magdalena Andersson's ID
  const persons = await fetchJson('https://data.riksdagen.se/personlista/?utformat=json');
  const magda = persons.personlista.person.find(p => p.tilltalsnamn === 'Magdalena' && p.efternamn === 'Andersson' && p.parti === 'S');
  
  if (!magda) return console.log("Not found");
  console.log("Found:", magda.intressent_id, magda.personuppdrag);
  
  // Fetch motions (mot)
  const motions = await fetchJson(`https://data.riksdagen.se/dokumentlista/?iid=${magda.intressent_id}&doktyp=mot&rm=2024/25&utformat=json`);
  console.log("Motions count 2024/25:", motions.dokumentlista["@traffar"]);
  
  // Fetch speeches
  const anforanden = await fetchJson(`https://data.riksdagen.se/anforandelista/?iid=${magda.intressent_id}&rm=2024/25&utformat=json`);
  console.log("Anföranden 2024/25:", anforanden.anforandelista["@antal"]);
}

main();
