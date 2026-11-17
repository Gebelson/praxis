export const supportedLanguages=['pt','en','es','zh','fr','pt-PT'];
export const languageCode=value=>{
  if(typeof value!=='string')return null;
  const code=value.toLowerCase().replaceAll('_','-');
  if(code==='pt-pt')return 'pt-PT';
  return code.split('-')[0];
};
export function resolveLanguage({requested,saved,languages=[]}={}){
  for(const value of [requested,saved,...languages]){const code=languageCode(value);if(supportedLanguages.includes(code))return code;}
  return 'pt';
}
