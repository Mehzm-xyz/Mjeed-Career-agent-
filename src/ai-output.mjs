export function readAIText(result){
 const output=typeof result==='string'?result:
  typeof result?.response==='string'?result.response:
  typeof result?.choices?.[0]?.message?.content==='string'?result.choices[0].message.content:
  result?.response&&typeof result.response==='object'?JSON.stringify(result.response):'';
 if(output.trim().length<8)throw Error('لم يسترجع النموذج نصًا قابلاً للاستخدام');
 return output.slice(0,13000);
}
