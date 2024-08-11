import * as d3 from "npm:d3";

function cleanCsvHeader(csvString) {
  const lines = csvString.split('\n');
  const cleanedHeader = lines[0].split(',').map(header => header.trim()).join(',');
  lines[0] = cleanedHeader;
  return lines.join('\n');
}

function sessionStorageCache(key, loadFunction) {
  const cachedData = sessionStorage.getItem(key);
  if (cachedData) {
      return Promise.resolve(cachedData);
  } else {
      return loadFunction().then(data => {
          sessionStorage.setItem(key, data);
          return data;
      });
  }
}


const csvUrl = 'https://raw.githubusercontent.com/WinstonFassett/stars/main/stars.csv'

export const text = sessionStorageCache('starsCsvData', () => d3.text(csvUrl))

const data = text.then(text => {
  const cleaned =  cleanCsvHeader(text)
  const parsed = d3.csvParse(cleaned, d3.autoType)
  return parsed;
}).then(data => {
  return data.map(({ 
    owner_avatar_url: avatar, 
    full_name, 
    description, 
    stargazers_count, 
    language, license_name, 
    topics, homepage, 
    starred_at, 
    html_url,
    name,
    ...rest  
  }) => ({ 
    avatar, 
    full_name, 
    description, 
    stargazers_count, 
    language, 
    license_name, 
    topics, 
    homepage, 
    starred_at, 
    ...rest  
  }))
})

export default data;