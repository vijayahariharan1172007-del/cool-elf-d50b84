async function invokeVercel(vercelHandler,event){
  return new Promise((resolve,reject)=>{
    const bodyText=event.body||''; let body={};
    if(bodyText){try{body=event.isBase64Encoded?JSON.parse(Buffer.from(bodyText,'base64').toString('utf8')):JSON.parse(bodyText)}catch{body={}}}
    const req={method:event.httpMethod||'GET',body,query:event.queryStringParameters||{},headers:event.headers||{}};
    const result={statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:''};
    const res={get statusCode(){return result.statusCode},set statusCode(v){result.statusCode=Number(v)||200},status(code){result.statusCode=code;return res},json(payload){result.headers['Content-Type']='application/json';result.body=JSON.stringify(payload);resolve(result);return res},redirect(code,url){result.statusCode=code;result.headers.Location=url;result.body='';resolve(result);return res},setHeader(name,value){result.headers[name]=value;return res},getHeader(name){return result.headers[name]}};
    Promise.resolve(vercelHandler(req,res)).then(()=>{if(result.body!==''||result.statusCode!==200||result.headers.Location)resolve(result)}).catch(reject);
  });
}
module.exports={invokeVercel};
