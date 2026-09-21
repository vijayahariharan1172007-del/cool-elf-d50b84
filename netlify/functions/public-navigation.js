const {invokeVercel}=require('../adapter');const handler=require('../../api/public-navigation');exports.handler=async(event)=>invokeVercel(handler,event);
