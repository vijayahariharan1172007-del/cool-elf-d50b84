const {invokeVercel}=require('../adapter');const handler=require('../../api/register-master');exports.handler=(event)=>invokeVercel(handler,event);
