const {invokeVercel}=require('../adapter');const handler=require('../../api/consume-email-verification');exports.handler=(event,context)=>invokeVercel(handler,event);
