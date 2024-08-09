import * as d3 from "npm:d3";

function cleanCsvHeader(csvString) {
  // Split the CSV string into lines
  const lines = csvString.split('\n');
  // Clean up the header row by trimming spaces
  const cleanedHeader = lines[0].split(',').map(header => header.trim()).join(',');
  // Combine the cleaned header with the rest of the CSV lines
  lines[0] = cleanedHeader;
  return lines.join('\n');
}

const text = d3.text('https://raw.githubusercontent.com/WinstonFassett/stars/main/stars.csv')
// const stars = data.csv({typed: true})
const data = text.then(text => {
  const cleaned =  cleanCsvHeader(text)
  const parsed = d3.csvParse(cleaned, d3.autoType)
  return parsed;
}).then(data => {
  return data.map(({ owner_avatar_url: avatar, full_name, description, stargazers_count, language, license_name, topics, homepage, starred_at, ...rest  }) => ({ avatar, full_name, description, stargazers_count, language, license_name, topics, homepage, starred_at, ...rest  }))
})

export default data;