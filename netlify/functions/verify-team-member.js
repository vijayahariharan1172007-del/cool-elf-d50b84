const {invokeVercel}=require('../adapter');
const handler=require('../../api/verify-team-member');
exports.handler=(event)=>invokeVercel(handler,event);
