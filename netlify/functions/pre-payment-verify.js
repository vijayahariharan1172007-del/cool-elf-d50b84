const {invokeVercel}=require('../adapter');const handler=require('../../api/pre-payment-verify');exports.handler=(event)=>invokeVercel(handler,event);
