const {invokeVercel}=require('../adapter');const handler=require('../../api/send-email-verification');exports.handler=(event,context)=>invokeVercel(handler,event);
