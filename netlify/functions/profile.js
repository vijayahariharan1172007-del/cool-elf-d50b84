const {invokeVercel}=require('../adapter');
const handler=require('../../api/profile');
exports.handler=(event)=>invokeVercel(handler,event);
