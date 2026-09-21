const {invokeVercel}=require('../adapter');const handler=require('../../api/submit-abstract');exports.handler=(event)=>invokeVercel(handler,event);
