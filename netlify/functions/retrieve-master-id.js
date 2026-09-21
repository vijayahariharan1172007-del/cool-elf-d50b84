const {invokeVercel}=require('../adapter');
const handler=require('../../api/retrieve-master-id');
exports.handler=(event)=>invokeVercel(handler,event);
