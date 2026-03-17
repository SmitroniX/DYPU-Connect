const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'main',
  service: 'dypu-connect',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const sendDirectMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SendDirectMessage', inputVars);
}
sendDirectMessageRef.operationName = 'SendDirectMessage';
exports.sendDirectMessageRef = sendDirectMessageRef;

exports.sendDirectMessage = function sendDirectMessage(dcOrVars, vars) {
  return executeMutation(sendDirectMessageRef(dcOrVars, vars));
};

const listDirectMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDirectMessages', inputVars);
}
listDirectMessagesRef.operationName = 'ListDirectMessages';
exports.listDirectMessagesRef = listDirectMessagesRef;

exports.listDirectMessages = function listDirectMessages(dcOrVars, vars) {
  return executeQuery(listDirectMessagesRef(dcOrVars, vars));
};

const updateDirectMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateDirectMessage', inputVars);
}
updateDirectMessageRef.operationName = 'UpdateDirectMessage';
exports.updateDirectMessageRef = updateDirectMessageRef;

exports.updateDirectMessage = function updateDirectMessage(dcOrVars, vars) {
  return executeMutation(updateDirectMessageRef(dcOrVars, vars));
};

const deleteDirectMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteDirectMessage', inputVars);
}
deleteDirectMessageRef.operationName = 'DeleteDirectMessage';
exports.deleteDirectMessageRef = deleteDirectMessageRef;

exports.deleteDirectMessage = function deleteDirectMessage(dcOrVars, vars) {
  return executeMutation(deleteDirectMessageRef(dcOrVars, vars));
};

const sendGroupMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SendGroupMessage', inputVars);
}
sendGroupMessageRef.operationName = 'SendGroupMessage';
exports.sendGroupMessageRef = sendGroupMessageRef;

exports.sendGroupMessage = function sendGroupMessage(dcOrVars, vars) {
  return executeMutation(sendGroupMessageRef(dcOrVars, vars));
};

const listGroupMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListGroupMessages', inputVars);
}
listGroupMessagesRef.operationName = 'ListGroupMessages';
exports.listGroupMessagesRef = listGroupMessagesRef;

exports.listGroupMessages = function listGroupMessages(dcOrVars, vars) {
  return executeQuery(listGroupMessagesRef(dcOrVars, vars));
};

const updateGroupMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateGroupMessage', inputVars);
}
updateGroupMessageRef.operationName = 'UpdateGroupMessage';
exports.updateGroupMessageRef = updateGroupMessageRef;

exports.updateGroupMessage = function updateGroupMessage(dcOrVars, vars) {
  return executeMutation(updateGroupMessageRef(dcOrVars, vars));
};

const deleteGroupMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteGroupMessage', inputVars);
}
deleteGroupMessageRef.operationName = 'DeleteGroupMessage';
exports.deleteGroupMessageRef = deleteGroupMessageRef;

exports.deleteGroupMessage = function deleteGroupMessage(dcOrVars, vars) {
  return executeMutation(deleteGroupMessageRef(dcOrVars, vars));
};

const sendPublicMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SendPublicMessage', inputVars);
}
sendPublicMessageRef.operationName = 'SendPublicMessage';
exports.sendPublicMessageRef = sendPublicMessageRef;

exports.sendPublicMessage = function sendPublicMessage(dcOrVars, vars) {
  return executeMutation(sendPublicMessageRef(dcOrVars, vars));
};

const listPublicMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicMessages', inputVars);
}
listPublicMessagesRef.operationName = 'ListPublicMessages';
exports.listPublicMessagesRef = listPublicMessagesRef;

exports.listPublicMessages = function listPublicMessages(dcOrVars, vars) {
  return executeQuery(listPublicMessagesRef(dcOrVars, vars));
};

const updatePublicMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdatePublicMessage', inputVars);
}
updatePublicMessageRef.operationName = 'UpdatePublicMessage';
exports.updatePublicMessageRef = updatePublicMessageRef;

exports.updatePublicMessage = function updatePublicMessage(dcOrVars, vars) {
  return executeMutation(updatePublicMessageRef(dcOrVars, vars));
};

const deletePublicMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeletePublicMessage', inputVars);
}
deletePublicMessageRef.operationName = 'DeletePublicMessage';
exports.deletePublicMessageRef = deletePublicMessageRef;

exports.deletePublicMessage = function deletePublicMessage(dcOrVars, vars) {
  return executeMutation(deletePublicMessageRef(dcOrVars, vars));
};
