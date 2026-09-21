const {invokeVercel}=require('../adapter');const handler=require('../../api/create-event-registration');exports.handler=(event)=>invokeVercel(handler,event);
