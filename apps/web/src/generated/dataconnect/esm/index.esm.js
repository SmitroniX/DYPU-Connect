import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'main',
  service: 'dypu-connect',
  location: 'us-east4'
};

export const sendDirectMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SendDirectMessage', inputVars);
}
sendDirectMessageRef.operationName = 'SendDirectMessage';

export function sendDirectMessage(dcOrVars, vars) {
  return executeMutation(sendDirectMessageRef(dcOrVars, vars));
}

export const listDirectMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDirectMessages', inputVars);
}
listDirectMessagesRef.operationName = 'ListDirectMessages';

export function listDirectMessages(dcOrVars, vars) {
  return executeQuery(listDirectMessagesRef(dcOrVars, vars));
}

export const updateDirectMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateDirectMessage', inputVars);
}
updateDirectMessageRef.operationName = 'UpdateDirectMessage';

export function updateDirectMessage(dcOrVars, vars) {
  return executeMutation(updateDirectMessageRef(dcOrVars, vars));
}

export const deleteDirectMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteDirectMessage', inputVars);
}
deleteDirectMessageRef.operationName = 'DeleteDirectMessage';

export function deleteDirectMessage(dcOrVars, vars) {
  return executeMutation(deleteDirectMessageRef(dcOrVars, vars));
}

export const sendGroupMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SendGroupMessage', inputVars);
}
sendGroupMessageRef.operationName = 'SendGroupMessage';

export function sendGroupMessage(dcOrVars, vars) {
  return executeMutation(sendGroupMessageRef(dcOrVars, vars));
}

export const listGroupMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListGroupMessages', inputVars);
}
listGroupMessagesRef.operationName = 'ListGroupMessages';

export function listGroupMessages(dcOrVars, vars) {
  return executeQuery(listGroupMessagesRef(dcOrVars, vars));
}

export const updateGroupMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateGroupMessage', inputVars);
}
updateGroupMessageRef.operationName = 'UpdateGroupMessage';

export function updateGroupMessage(dcOrVars, vars) {
  return executeMutation(updateGroupMessageRef(dcOrVars, vars));
}

export const deleteGroupMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteGroupMessage', inputVars);
}
deleteGroupMessageRef.operationName = 'DeleteGroupMessage';

export function deleteGroupMessage(dcOrVars, vars) {
  return executeMutation(deleteGroupMessageRef(dcOrVars, vars));
}

export const sendPublicMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SendPublicMessage', inputVars);
}
sendPublicMessageRef.operationName = 'SendPublicMessage';

export function sendPublicMessage(dcOrVars, vars) {
  return executeMutation(sendPublicMessageRef(dcOrVars, vars));
}

export const listPublicMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicMessages', inputVars);
}
listPublicMessagesRef.operationName = 'ListPublicMessages';

export function listPublicMessages(dcOrVars, vars) {
  return executeQuery(listPublicMessagesRef(dcOrVars, vars));
}

export const updatePublicMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdatePublicMessage', inputVars);
}
updatePublicMessageRef.operationName = 'UpdatePublicMessage';

export function updatePublicMessage(dcOrVars, vars) {
  return executeMutation(updatePublicMessageRef(dcOrVars, vars));
}

export const deletePublicMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeletePublicMessage', inputVars);
}
deletePublicMessageRef.operationName = 'DeletePublicMessage';

export function deletePublicMessage(dcOrVars, vars) {
  return executeMutation(deletePublicMessageRef(dcOrVars, vars));
}

