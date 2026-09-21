module.exports=async function(event,context,handler){
 const body=event.body?(()=>{try{return JSON.parse(event.body)}catch{return {}}})():{};
 const req={method:event.httpMethod||'GET',body,headers:event.headers||{},query:event.queryStringParameters||{},cookies:event.cookies||{}};
 let statusCode=200, payload=null, headers={'content-type':'application/json'};
 const res={status(code){statusCode=code;return res;},json(x){payload=x;return res;},setHeader(k,v){headers[String(k).toLowerCase()]=v;return res;}};
 await handler(req,res);
 return {statusCode,headers,body:JSON.stringify(payload??{})};
};
