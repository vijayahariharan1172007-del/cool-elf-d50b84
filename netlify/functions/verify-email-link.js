const {invokeVercel}=require('../adapter');const handler=require('../../api/verify-email-link');exports.handler=(event,context)=>invokeVercel(handler,event);
