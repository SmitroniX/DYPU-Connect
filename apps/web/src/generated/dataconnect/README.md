# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `main`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListDirectMessages*](#listdirectmessages)
  - [*ListGroupMessages*](#listgroupmessages)
  - [*ListPublicMessages*](#listpublicmessages)
- [**Mutations**](#mutations)
  - [*SendDirectMessage*](#senddirectmessage)
  - [*UpdateDirectMessage*](#updatedirectmessage)
  - [*DeleteDirectMessage*](#deletedirectmessage)
  - [*SendGroupMessage*](#sendgroupmessage)
  - [*UpdateGroupMessage*](#updategroupmessage)
  - [*DeleteGroupMessage*](#deletegroupmessage)
  - [*SendPublicMessage*](#sendpublicmessage)
  - [*UpdatePublicMessage*](#updatepublicmessage)
  - [*DeletePublicMessage*](#deletepublicmessage)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `main`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dypu-connect/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dypu-connect/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dypu-connect/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `main` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListDirectMessages
You can execute the `ListDirectMessages` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listDirectMessages(vars: ListDirectMessagesVariables): QueryPromise<ListDirectMessagesData, ListDirectMessagesVariables>;

interface ListDirectMessagesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDirectMessagesVariables): QueryRef<ListDirectMessagesData, ListDirectMessagesVariables>;
}
export const listDirectMessagesRef: ListDirectMessagesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDirectMessages(dc: DataConnect, vars: ListDirectMessagesVariables): QueryPromise<ListDirectMessagesData, ListDirectMessagesVariables>;

interface ListDirectMessagesRef {
  ...
  (dc: DataConnect, vars: ListDirectMessagesVariables): QueryRef<ListDirectMessagesData, ListDirectMessagesVariables>;
}
export const listDirectMessagesRef: ListDirectMessagesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDirectMessagesRef:
```typescript
const name = listDirectMessagesRef.operationName;
console.log(name);
```

### Variables
The `ListDirectMessages` query requires an argument of type `ListDirectMessagesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListDirectMessagesVariables {
  currentUserId: string;
  otherUserId: string;
}
```
### Return Type
Recall that executing the `ListDirectMessages` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDirectMessagesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDirectMessagesData {
  directMessages: ({
    id: UUIDString;
    messageContent: string;
    senderStudentId: string;
    receiverStudentId: string;
    sentAt: TimestampString;
    imageUrl?: string | null;
    blurHash?: string | null;
    gifUrl?: string | null;
    audioUrl?: string | null;
    reactions?: unknown | null;
    isEdited?: boolean | null;
    isDeleted?: boolean | null;
    replyToId?: UUIDString | null;
  } & DirectMessage_Key)[];
}
```
### Using `ListDirectMessages`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDirectMessages, ListDirectMessagesVariables } from '@dypu-connect/dataconnect';

// The `ListDirectMessages` query requires an argument of type `ListDirectMessagesVariables`:
const listDirectMessagesVars: ListDirectMessagesVariables = {
  currentUserId: ..., 
  otherUserId: ..., 
};

// Call the `listDirectMessages()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDirectMessages(listDirectMessagesVars);
// Variables can be defined inline as well.
const { data } = await listDirectMessages({ currentUserId: ..., otherUserId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDirectMessages(dataConnect, listDirectMessagesVars);

console.log(data.directMessages);

// Or, you can use the `Promise` API.
listDirectMessages(listDirectMessagesVars).then((response) => {
  const data = response.data;
  console.log(data.directMessages);
});
```

### Using `ListDirectMessages`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDirectMessagesRef, ListDirectMessagesVariables } from '@dypu-connect/dataconnect';

// The `ListDirectMessages` query requires an argument of type `ListDirectMessagesVariables`:
const listDirectMessagesVars: ListDirectMessagesVariables = {
  currentUserId: ..., 
  otherUserId: ..., 
};

// Call the `listDirectMessagesRef()` function to get a reference to the query.
const ref = listDirectMessagesRef(listDirectMessagesVars);
// Variables can be defined inline as well.
const ref = listDirectMessagesRef({ currentUserId: ..., otherUserId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDirectMessagesRef(dataConnect, listDirectMessagesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.directMessages);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.directMessages);
});
```

## ListGroupMessages
You can execute the `ListGroupMessages` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listGroupMessages(vars: ListGroupMessagesVariables): QueryPromise<ListGroupMessagesData, ListGroupMessagesVariables>;

interface ListGroupMessagesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListGroupMessagesVariables): QueryRef<ListGroupMessagesData, ListGroupMessagesVariables>;
}
export const listGroupMessagesRef: ListGroupMessagesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listGroupMessages(dc: DataConnect, vars: ListGroupMessagesVariables): QueryPromise<ListGroupMessagesData, ListGroupMessagesVariables>;

interface ListGroupMessagesRef {
  ...
  (dc: DataConnect, vars: ListGroupMessagesVariables): QueryRef<ListGroupMessagesData, ListGroupMessagesVariables>;
}
export const listGroupMessagesRef: ListGroupMessagesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listGroupMessagesRef:
```typescript
const name = listGroupMessagesRef.operationName;
console.log(name);
```

### Variables
The `ListGroupMessages` query requires an argument of type `ListGroupMessagesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListGroupMessagesVariables {
  groupName: string;
}
```
### Return Type
Recall that executing the `ListGroupMessages` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListGroupMessagesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListGroupMessagesData {
  groupMessages: ({
    id: UUIDString;
    messageContent: string;
    senderStudentId: string;
    sender: {
      firstName: string;
      lastName: string;
      profilePictureUrl?: string | null;
    };
      groupName: string;
      sentAt: TimestampString;
      imageUrl?: string | null;
      blurHash?: string | null;
      gifUrl?: string | null;
      audioUrl?: string | null;
      reactions?: unknown | null;
      isEdited?: boolean | null;
      isDeleted?: boolean | null;
      replyToId?: UUIDString | null;
  } & GroupMessage_Key)[];
}
```
### Using `ListGroupMessages`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listGroupMessages, ListGroupMessagesVariables } from '@dypu-connect/dataconnect';

// The `ListGroupMessages` query requires an argument of type `ListGroupMessagesVariables`:
const listGroupMessagesVars: ListGroupMessagesVariables = {
  groupName: ..., 
};

// Call the `listGroupMessages()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listGroupMessages(listGroupMessagesVars);
// Variables can be defined inline as well.
const { data } = await listGroupMessages({ groupName: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listGroupMessages(dataConnect, listGroupMessagesVars);

console.log(data.groupMessages);

// Or, you can use the `Promise` API.
listGroupMessages(listGroupMessagesVars).then((response) => {
  const data = response.data;
  console.log(data.groupMessages);
});
```

### Using `ListGroupMessages`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listGroupMessagesRef, ListGroupMessagesVariables } from '@dypu-connect/dataconnect';

// The `ListGroupMessages` query requires an argument of type `ListGroupMessagesVariables`:
const listGroupMessagesVars: ListGroupMessagesVariables = {
  groupName: ..., 
};

// Call the `listGroupMessagesRef()` function to get a reference to the query.
const ref = listGroupMessagesRef(listGroupMessagesVars);
// Variables can be defined inline as well.
const ref = listGroupMessagesRef({ groupName: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listGroupMessagesRef(dataConnect, listGroupMessagesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.groupMessages);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.groupMessages);
});
```

## ListPublicMessages
You can execute the `ListPublicMessages` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listPublicMessages(vars: ListPublicMessagesVariables): QueryPromise<ListPublicMessagesData, ListPublicMessagesVariables>;

interface ListPublicMessagesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPublicMessagesVariables): QueryRef<ListPublicMessagesData, ListPublicMessagesVariables>;
}
export const listPublicMessagesRef: ListPublicMessagesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPublicMessages(dc: DataConnect, vars: ListPublicMessagesVariables): QueryPromise<ListPublicMessagesData, ListPublicMessagesVariables>;

interface ListPublicMessagesRef {
  ...
  (dc: DataConnect, vars: ListPublicMessagesVariables): QueryRef<ListPublicMessagesData, ListPublicMessagesVariables>;
}
export const listPublicMessagesRef: ListPublicMessagesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPublicMessagesRef:
```typescript
const name = listPublicMessagesRef.operationName;
console.log(name);
```

### Variables
The `ListPublicMessages` query requires an argument of type `ListPublicMessagesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListPublicMessagesVariables {
  now: TimestampString;
}
```
### Return Type
Recall that executing the `ListPublicMessages` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPublicMessagesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPublicMessagesData {
  publicMessages: ({
    id: UUIDString;
    messageContent: string;
    senderStudentId: string;
    sender: {
      firstName: string;
      lastName: string;
      profilePictureUrl?: string | null;
    };
      sentAt: TimestampString;
      imageUrl?: string | null;
      blurHash?: string | null;
      gifUrl?: string | null;
      audioUrl?: string | null;
      reactions?: unknown | null;
      isEdited?: boolean | null;
      isDeleted?: boolean | null;
      expiresAt: TimestampString;
  } & PublicMessage_Key)[];
}
```
### Using `ListPublicMessages`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPublicMessages, ListPublicMessagesVariables } from '@dypu-connect/dataconnect';

// The `ListPublicMessages` query requires an argument of type `ListPublicMessagesVariables`:
const listPublicMessagesVars: ListPublicMessagesVariables = {
  now: ..., 
};

// Call the `listPublicMessages()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPublicMessages(listPublicMessagesVars);
// Variables can be defined inline as well.
const { data } = await listPublicMessages({ now: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPublicMessages(dataConnect, listPublicMessagesVars);

console.log(data.publicMessages);

// Or, you can use the `Promise` API.
listPublicMessages(listPublicMessagesVars).then((response) => {
  const data = response.data;
  console.log(data.publicMessages);
});
```

### Using `ListPublicMessages`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPublicMessagesRef, ListPublicMessagesVariables } from '@dypu-connect/dataconnect';

// The `ListPublicMessages` query requires an argument of type `ListPublicMessagesVariables`:
const listPublicMessagesVars: ListPublicMessagesVariables = {
  now: ..., 
};

// Call the `listPublicMessagesRef()` function to get a reference to the query.
const ref = listPublicMessagesRef(listPublicMessagesVars);
// Variables can be defined inline as well.
const ref = listPublicMessagesRef({ now: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPublicMessagesRef(dataConnect, listPublicMessagesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.publicMessages);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.publicMessages);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `main` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## SendDirectMessage
You can execute the `SendDirectMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
sendDirectMessage(vars: SendDirectMessageVariables): MutationPromise<SendDirectMessageData, SendDirectMessageVariables>;

interface SendDirectMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SendDirectMessageVariables): MutationRef<SendDirectMessageData, SendDirectMessageVariables>;
}
export const sendDirectMessageRef: SendDirectMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
sendDirectMessage(dc: DataConnect, vars: SendDirectMessageVariables): MutationPromise<SendDirectMessageData, SendDirectMessageVariables>;

interface SendDirectMessageRef {
  ...
  (dc: DataConnect, vars: SendDirectMessageVariables): MutationRef<SendDirectMessageData, SendDirectMessageVariables>;
}
export const sendDirectMessageRef: SendDirectMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the sendDirectMessageRef:
```typescript
const name = sendDirectMessageRef.operationName;
console.log(name);
```

### Variables
The `SendDirectMessage` mutation requires an argument of type `SendDirectMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SendDirectMessageVariables {
  senderId: string;
  receiverId: string;
  messageContent: string;
  imageUrl?: string | null;
  blurHash?: string | null;
  gifUrl?: string | null;
  audioUrl?: string | null;
  replyToId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `SendDirectMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SendDirectMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SendDirectMessageData {
  directMessage_insert: DirectMessage_Key;
}
```
### Using `SendDirectMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, sendDirectMessage, SendDirectMessageVariables } from '@dypu-connect/dataconnect';

// The `SendDirectMessage` mutation requires an argument of type `SendDirectMessageVariables`:
const sendDirectMessageVars: SendDirectMessageVariables = {
  senderId: ..., 
  receiverId: ..., 
  messageContent: ..., 
  imageUrl: ..., // optional
  blurHash: ..., // optional
  gifUrl: ..., // optional
  audioUrl: ..., // optional
  replyToId: ..., // optional
};

// Call the `sendDirectMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await sendDirectMessage(sendDirectMessageVars);
// Variables can be defined inline as well.
const { data } = await sendDirectMessage({ senderId: ..., receiverId: ..., messageContent: ..., imageUrl: ..., blurHash: ..., gifUrl: ..., audioUrl: ..., replyToId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await sendDirectMessage(dataConnect, sendDirectMessageVars);

console.log(data.directMessage_insert);

// Or, you can use the `Promise` API.
sendDirectMessage(sendDirectMessageVars).then((response) => {
  const data = response.data;
  console.log(data.directMessage_insert);
});
```

### Using `SendDirectMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, sendDirectMessageRef, SendDirectMessageVariables } from '@dypu-connect/dataconnect';

// The `SendDirectMessage` mutation requires an argument of type `SendDirectMessageVariables`:
const sendDirectMessageVars: SendDirectMessageVariables = {
  senderId: ..., 
  receiverId: ..., 
  messageContent: ..., 
  imageUrl: ..., // optional
  blurHash: ..., // optional
  gifUrl: ..., // optional
  audioUrl: ..., // optional
  replyToId: ..., // optional
};

// Call the `sendDirectMessageRef()` function to get a reference to the mutation.
const ref = sendDirectMessageRef(sendDirectMessageVars);
// Variables can be defined inline as well.
const ref = sendDirectMessageRef({ senderId: ..., receiverId: ..., messageContent: ..., imageUrl: ..., blurHash: ..., gifUrl: ..., audioUrl: ..., replyToId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = sendDirectMessageRef(dataConnect, sendDirectMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.directMessage_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.directMessage_insert);
});
```

## UpdateDirectMessage
You can execute the `UpdateDirectMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateDirectMessage(vars: UpdateDirectMessageVariables): MutationPromise<UpdateDirectMessageData, UpdateDirectMessageVariables>;

interface UpdateDirectMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateDirectMessageVariables): MutationRef<UpdateDirectMessageData, UpdateDirectMessageVariables>;
}
export const updateDirectMessageRef: UpdateDirectMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateDirectMessage(dc: DataConnect, vars: UpdateDirectMessageVariables): MutationPromise<UpdateDirectMessageData, UpdateDirectMessageVariables>;

interface UpdateDirectMessageRef {
  ...
  (dc: DataConnect, vars: UpdateDirectMessageVariables): MutationRef<UpdateDirectMessageData, UpdateDirectMessageVariables>;
}
export const updateDirectMessageRef: UpdateDirectMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateDirectMessageRef:
```typescript
const name = updateDirectMessageRef.operationName;
console.log(name);
```

### Variables
The `UpdateDirectMessage` mutation requires an argument of type `UpdateDirectMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateDirectMessageVariables {
  id: UUIDString;
  messageContent?: string | null;
  isEdited?: boolean | null;
  isDeleted?: boolean | null;
  reactions?: unknown | null;
}
```
### Return Type
Recall that executing the `UpdateDirectMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateDirectMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateDirectMessageData {
  directMessage_update?: DirectMessage_Key | null;
}
```
### Using `UpdateDirectMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateDirectMessage, UpdateDirectMessageVariables } from '@dypu-connect/dataconnect';

// The `UpdateDirectMessage` mutation requires an argument of type `UpdateDirectMessageVariables`:
const updateDirectMessageVars: UpdateDirectMessageVariables = {
  id: ..., 
  messageContent: ..., // optional
  isEdited: ..., // optional
  isDeleted: ..., // optional
  reactions: ..., // optional
};

// Call the `updateDirectMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateDirectMessage(updateDirectMessageVars);
// Variables can be defined inline as well.
const { data } = await updateDirectMessage({ id: ..., messageContent: ..., isEdited: ..., isDeleted: ..., reactions: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateDirectMessage(dataConnect, updateDirectMessageVars);

console.log(data.directMessage_update);

// Or, you can use the `Promise` API.
updateDirectMessage(updateDirectMessageVars).then((response) => {
  const data = response.data;
  console.log(data.directMessage_update);
});
```

### Using `UpdateDirectMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateDirectMessageRef, UpdateDirectMessageVariables } from '@dypu-connect/dataconnect';

// The `UpdateDirectMessage` mutation requires an argument of type `UpdateDirectMessageVariables`:
const updateDirectMessageVars: UpdateDirectMessageVariables = {
  id: ..., 
  messageContent: ..., // optional
  isEdited: ..., // optional
  isDeleted: ..., // optional
  reactions: ..., // optional
};

// Call the `updateDirectMessageRef()` function to get a reference to the mutation.
const ref = updateDirectMessageRef(updateDirectMessageVars);
// Variables can be defined inline as well.
const ref = updateDirectMessageRef({ id: ..., messageContent: ..., isEdited: ..., isDeleted: ..., reactions: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateDirectMessageRef(dataConnect, updateDirectMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.directMessage_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.directMessage_update);
});
```

## DeleteDirectMessage
You can execute the `DeleteDirectMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deleteDirectMessage(vars: DeleteDirectMessageVariables): MutationPromise<DeleteDirectMessageData, DeleteDirectMessageVariables>;

interface DeleteDirectMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteDirectMessageVariables): MutationRef<DeleteDirectMessageData, DeleteDirectMessageVariables>;
}
export const deleteDirectMessageRef: DeleteDirectMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteDirectMessage(dc: DataConnect, vars: DeleteDirectMessageVariables): MutationPromise<DeleteDirectMessageData, DeleteDirectMessageVariables>;

interface DeleteDirectMessageRef {
  ...
  (dc: DataConnect, vars: DeleteDirectMessageVariables): MutationRef<DeleteDirectMessageData, DeleteDirectMessageVariables>;
}
export const deleteDirectMessageRef: DeleteDirectMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteDirectMessageRef:
```typescript
const name = deleteDirectMessageRef.operationName;
console.log(name);
```

### Variables
The `DeleteDirectMessage` mutation requires an argument of type `DeleteDirectMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteDirectMessageVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteDirectMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteDirectMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteDirectMessageData {
  directMessage_delete?: DirectMessage_Key | null;
}
```
### Using `DeleteDirectMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteDirectMessage, DeleteDirectMessageVariables } from '@dypu-connect/dataconnect';

// The `DeleteDirectMessage` mutation requires an argument of type `DeleteDirectMessageVariables`:
const deleteDirectMessageVars: DeleteDirectMessageVariables = {
  id: ..., 
};

// Call the `deleteDirectMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteDirectMessage(deleteDirectMessageVars);
// Variables can be defined inline as well.
const { data } = await deleteDirectMessage({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteDirectMessage(dataConnect, deleteDirectMessageVars);

console.log(data.directMessage_delete);

// Or, you can use the `Promise` API.
deleteDirectMessage(deleteDirectMessageVars).then((response) => {
  const data = response.data;
  console.log(data.directMessage_delete);
});
```

### Using `DeleteDirectMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteDirectMessageRef, DeleteDirectMessageVariables } from '@dypu-connect/dataconnect';

// The `DeleteDirectMessage` mutation requires an argument of type `DeleteDirectMessageVariables`:
const deleteDirectMessageVars: DeleteDirectMessageVariables = {
  id: ..., 
};

// Call the `deleteDirectMessageRef()` function to get a reference to the mutation.
const ref = deleteDirectMessageRef(deleteDirectMessageVars);
// Variables can be defined inline as well.
const ref = deleteDirectMessageRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteDirectMessageRef(dataConnect, deleteDirectMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.directMessage_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.directMessage_delete);
});
```

## SendGroupMessage
You can execute the `SendGroupMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
sendGroupMessage(vars: SendGroupMessageVariables): MutationPromise<SendGroupMessageData, SendGroupMessageVariables>;

interface SendGroupMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SendGroupMessageVariables): MutationRef<SendGroupMessageData, SendGroupMessageVariables>;
}
export const sendGroupMessageRef: SendGroupMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
sendGroupMessage(dc: DataConnect, vars: SendGroupMessageVariables): MutationPromise<SendGroupMessageData, SendGroupMessageVariables>;

interface SendGroupMessageRef {
  ...
  (dc: DataConnect, vars: SendGroupMessageVariables): MutationRef<SendGroupMessageData, SendGroupMessageVariables>;
}
export const sendGroupMessageRef: SendGroupMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the sendGroupMessageRef:
```typescript
const name = sendGroupMessageRef.operationName;
console.log(name);
```

### Variables
The `SendGroupMessage` mutation requires an argument of type `SendGroupMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SendGroupMessageVariables {
  senderId: string;
  groupName: string;
  messageContent: string;
  imageUrl?: string | null;
  blurHash?: string | null;
  gifUrl?: string | null;
  audioUrl?: string | null;
  replyToId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `SendGroupMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SendGroupMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SendGroupMessageData {
  groupMessage_insert: GroupMessage_Key;
}
```
### Using `SendGroupMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, sendGroupMessage, SendGroupMessageVariables } from '@dypu-connect/dataconnect';

// The `SendGroupMessage` mutation requires an argument of type `SendGroupMessageVariables`:
const sendGroupMessageVars: SendGroupMessageVariables = {
  senderId: ..., 
  groupName: ..., 
  messageContent: ..., 
  imageUrl: ..., // optional
  blurHash: ..., // optional
  gifUrl: ..., // optional
  audioUrl: ..., // optional
  replyToId: ..., // optional
};

// Call the `sendGroupMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await sendGroupMessage(sendGroupMessageVars);
// Variables can be defined inline as well.
const { data } = await sendGroupMessage({ senderId: ..., groupName: ..., messageContent: ..., imageUrl: ..., blurHash: ..., gifUrl: ..., audioUrl: ..., replyToId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await sendGroupMessage(dataConnect, sendGroupMessageVars);

console.log(data.groupMessage_insert);

// Or, you can use the `Promise` API.
sendGroupMessage(sendGroupMessageVars).then((response) => {
  const data = response.data;
  console.log(data.groupMessage_insert);
});
```

### Using `SendGroupMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, sendGroupMessageRef, SendGroupMessageVariables } from '@dypu-connect/dataconnect';

// The `SendGroupMessage` mutation requires an argument of type `SendGroupMessageVariables`:
const sendGroupMessageVars: SendGroupMessageVariables = {
  senderId: ..., 
  groupName: ..., 
  messageContent: ..., 
  imageUrl: ..., // optional
  blurHash: ..., // optional
  gifUrl: ..., // optional
  audioUrl: ..., // optional
  replyToId: ..., // optional
};

// Call the `sendGroupMessageRef()` function to get a reference to the mutation.
const ref = sendGroupMessageRef(sendGroupMessageVars);
// Variables can be defined inline as well.
const ref = sendGroupMessageRef({ senderId: ..., groupName: ..., messageContent: ..., imageUrl: ..., blurHash: ..., gifUrl: ..., audioUrl: ..., replyToId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = sendGroupMessageRef(dataConnect, sendGroupMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.groupMessage_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.groupMessage_insert);
});
```

## UpdateGroupMessage
You can execute the `UpdateGroupMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateGroupMessage(vars: UpdateGroupMessageVariables): MutationPromise<UpdateGroupMessageData, UpdateGroupMessageVariables>;

interface UpdateGroupMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateGroupMessageVariables): MutationRef<UpdateGroupMessageData, UpdateGroupMessageVariables>;
}
export const updateGroupMessageRef: UpdateGroupMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateGroupMessage(dc: DataConnect, vars: UpdateGroupMessageVariables): MutationPromise<UpdateGroupMessageData, UpdateGroupMessageVariables>;

interface UpdateGroupMessageRef {
  ...
  (dc: DataConnect, vars: UpdateGroupMessageVariables): MutationRef<UpdateGroupMessageData, UpdateGroupMessageVariables>;
}
export const updateGroupMessageRef: UpdateGroupMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateGroupMessageRef:
```typescript
const name = updateGroupMessageRef.operationName;
console.log(name);
```

### Variables
The `UpdateGroupMessage` mutation requires an argument of type `UpdateGroupMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateGroupMessageVariables {
  id: UUIDString;
  messageContent?: string | null;
  isEdited?: boolean | null;
  isDeleted?: boolean | null;
  reactions?: unknown | null;
}
```
### Return Type
Recall that executing the `UpdateGroupMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateGroupMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateGroupMessageData {
  groupMessage_update?: GroupMessage_Key | null;
}
```
### Using `UpdateGroupMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateGroupMessage, UpdateGroupMessageVariables } from '@dypu-connect/dataconnect';

// The `UpdateGroupMessage` mutation requires an argument of type `UpdateGroupMessageVariables`:
const updateGroupMessageVars: UpdateGroupMessageVariables = {
  id: ..., 
  messageContent: ..., // optional
  isEdited: ..., // optional
  isDeleted: ..., // optional
  reactions: ..., // optional
};

// Call the `updateGroupMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateGroupMessage(updateGroupMessageVars);
// Variables can be defined inline as well.
const { data } = await updateGroupMessage({ id: ..., messageContent: ..., isEdited: ..., isDeleted: ..., reactions: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateGroupMessage(dataConnect, updateGroupMessageVars);

console.log(data.groupMessage_update);

// Or, you can use the `Promise` API.
updateGroupMessage(updateGroupMessageVars).then((response) => {
  const data = response.data;
  console.log(data.groupMessage_update);
});
```

### Using `UpdateGroupMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateGroupMessageRef, UpdateGroupMessageVariables } from '@dypu-connect/dataconnect';

// The `UpdateGroupMessage` mutation requires an argument of type `UpdateGroupMessageVariables`:
const updateGroupMessageVars: UpdateGroupMessageVariables = {
  id: ..., 
  messageContent: ..., // optional
  isEdited: ..., // optional
  isDeleted: ..., // optional
  reactions: ..., // optional
};

// Call the `updateGroupMessageRef()` function to get a reference to the mutation.
const ref = updateGroupMessageRef(updateGroupMessageVars);
// Variables can be defined inline as well.
const ref = updateGroupMessageRef({ id: ..., messageContent: ..., isEdited: ..., isDeleted: ..., reactions: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateGroupMessageRef(dataConnect, updateGroupMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.groupMessage_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.groupMessage_update);
});
```

## DeleteGroupMessage
You can execute the `DeleteGroupMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deleteGroupMessage(vars: DeleteGroupMessageVariables): MutationPromise<DeleteGroupMessageData, DeleteGroupMessageVariables>;

interface DeleteGroupMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteGroupMessageVariables): MutationRef<DeleteGroupMessageData, DeleteGroupMessageVariables>;
}
export const deleteGroupMessageRef: DeleteGroupMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteGroupMessage(dc: DataConnect, vars: DeleteGroupMessageVariables): MutationPromise<DeleteGroupMessageData, DeleteGroupMessageVariables>;

interface DeleteGroupMessageRef {
  ...
  (dc: DataConnect, vars: DeleteGroupMessageVariables): MutationRef<DeleteGroupMessageData, DeleteGroupMessageVariables>;
}
export const deleteGroupMessageRef: DeleteGroupMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteGroupMessageRef:
```typescript
const name = deleteGroupMessageRef.operationName;
console.log(name);
```

### Variables
The `DeleteGroupMessage` mutation requires an argument of type `DeleteGroupMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteGroupMessageVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteGroupMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteGroupMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteGroupMessageData {
  groupMessage_delete?: GroupMessage_Key | null;
}
```
### Using `DeleteGroupMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteGroupMessage, DeleteGroupMessageVariables } from '@dypu-connect/dataconnect';

// The `DeleteGroupMessage` mutation requires an argument of type `DeleteGroupMessageVariables`:
const deleteGroupMessageVars: DeleteGroupMessageVariables = {
  id: ..., 
};

// Call the `deleteGroupMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteGroupMessage(deleteGroupMessageVars);
// Variables can be defined inline as well.
const { data } = await deleteGroupMessage({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteGroupMessage(dataConnect, deleteGroupMessageVars);

console.log(data.groupMessage_delete);

// Or, you can use the `Promise` API.
deleteGroupMessage(deleteGroupMessageVars).then((response) => {
  const data = response.data;
  console.log(data.groupMessage_delete);
});
```

### Using `DeleteGroupMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteGroupMessageRef, DeleteGroupMessageVariables } from '@dypu-connect/dataconnect';

// The `DeleteGroupMessage` mutation requires an argument of type `DeleteGroupMessageVariables`:
const deleteGroupMessageVars: DeleteGroupMessageVariables = {
  id: ..., 
};

// Call the `deleteGroupMessageRef()` function to get a reference to the mutation.
const ref = deleteGroupMessageRef(deleteGroupMessageVars);
// Variables can be defined inline as well.
const ref = deleteGroupMessageRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteGroupMessageRef(dataConnect, deleteGroupMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.groupMessage_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.groupMessage_delete);
});
```

## SendPublicMessage
You can execute the `SendPublicMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
sendPublicMessage(vars: SendPublicMessageVariables): MutationPromise<SendPublicMessageData, SendPublicMessageVariables>;

interface SendPublicMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SendPublicMessageVariables): MutationRef<SendPublicMessageData, SendPublicMessageVariables>;
}
export const sendPublicMessageRef: SendPublicMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
sendPublicMessage(dc: DataConnect, vars: SendPublicMessageVariables): MutationPromise<SendPublicMessageData, SendPublicMessageVariables>;

interface SendPublicMessageRef {
  ...
  (dc: DataConnect, vars: SendPublicMessageVariables): MutationRef<SendPublicMessageData, SendPublicMessageVariables>;
}
export const sendPublicMessageRef: SendPublicMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the sendPublicMessageRef:
```typescript
const name = sendPublicMessageRef.operationName;
console.log(name);
```

### Variables
The `SendPublicMessage` mutation requires an argument of type `SendPublicMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SendPublicMessageVariables {
  senderId: string;
  messageContent: string;
  imageUrl?: string | null;
  blurHash?: string | null;
  gifUrl?: string | null;
  audioUrl?: string | null;
  expiresAt: TimestampString;
}
```
### Return Type
Recall that executing the `SendPublicMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SendPublicMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SendPublicMessageData {
  publicMessage_insert: PublicMessage_Key;
}
```
### Using `SendPublicMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, sendPublicMessage, SendPublicMessageVariables } from '@dypu-connect/dataconnect';

// The `SendPublicMessage` mutation requires an argument of type `SendPublicMessageVariables`:
const sendPublicMessageVars: SendPublicMessageVariables = {
  senderId: ..., 
  messageContent: ..., 
  imageUrl: ..., // optional
  blurHash: ..., // optional
  gifUrl: ..., // optional
  audioUrl: ..., // optional
  expiresAt: ..., 
};

// Call the `sendPublicMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await sendPublicMessage(sendPublicMessageVars);
// Variables can be defined inline as well.
const { data } = await sendPublicMessage({ senderId: ..., messageContent: ..., imageUrl: ..., blurHash: ..., gifUrl: ..., audioUrl: ..., expiresAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await sendPublicMessage(dataConnect, sendPublicMessageVars);

console.log(data.publicMessage_insert);

// Or, you can use the `Promise` API.
sendPublicMessage(sendPublicMessageVars).then((response) => {
  const data = response.data;
  console.log(data.publicMessage_insert);
});
```

### Using `SendPublicMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, sendPublicMessageRef, SendPublicMessageVariables } from '@dypu-connect/dataconnect';

// The `SendPublicMessage` mutation requires an argument of type `SendPublicMessageVariables`:
const sendPublicMessageVars: SendPublicMessageVariables = {
  senderId: ..., 
  messageContent: ..., 
  imageUrl: ..., // optional
  blurHash: ..., // optional
  gifUrl: ..., // optional
  audioUrl: ..., // optional
  expiresAt: ..., 
};

// Call the `sendPublicMessageRef()` function to get a reference to the mutation.
const ref = sendPublicMessageRef(sendPublicMessageVars);
// Variables can be defined inline as well.
const ref = sendPublicMessageRef({ senderId: ..., messageContent: ..., imageUrl: ..., blurHash: ..., gifUrl: ..., audioUrl: ..., expiresAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = sendPublicMessageRef(dataConnect, sendPublicMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.publicMessage_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.publicMessage_insert);
});
```

## UpdatePublicMessage
You can execute the `UpdatePublicMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updatePublicMessage(vars: UpdatePublicMessageVariables): MutationPromise<UpdatePublicMessageData, UpdatePublicMessageVariables>;

interface UpdatePublicMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdatePublicMessageVariables): MutationRef<UpdatePublicMessageData, UpdatePublicMessageVariables>;
}
export const updatePublicMessageRef: UpdatePublicMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updatePublicMessage(dc: DataConnect, vars: UpdatePublicMessageVariables): MutationPromise<UpdatePublicMessageData, UpdatePublicMessageVariables>;

interface UpdatePublicMessageRef {
  ...
  (dc: DataConnect, vars: UpdatePublicMessageVariables): MutationRef<UpdatePublicMessageData, UpdatePublicMessageVariables>;
}
export const updatePublicMessageRef: UpdatePublicMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updatePublicMessageRef:
```typescript
const name = updatePublicMessageRef.operationName;
console.log(name);
```

### Variables
The `UpdatePublicMessage` mutation requires an argument of type `UpdatePublicMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdatePublicMessageVariables {
  id: UUIDString;
  messageContent?: string | null;
  isEdited?: boolean | null;
  isDeleted?: boolean | null;
  reactions?: unknown | null;
}
```
### Return Type
Recall that executing the `UpdatePublicMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdatePublicMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdatePublicMessageData {
  publicMessage_update?: PublicMessage_Key | null;
}
```
### Using `UpdatePublicMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updatePublicMessage, UpdatePublicMessageVariables } from '@dypu-connect/dataconnect';

// The `UpdatePublicMessage` mutation requires an argument of type `UpdatePublicMessageVariables`:
const updatePublicMessageVars: UpdatePublicMessageVariables = {
  id: ..., 
  messageContent: ..., // optional
  isEdited: ..., // optional
  isDeleted: ..., // optional
  reactions: ..., // optional
};

// Call the `updatePublicMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updatePublicMessage(updatePublicMessageVars);
// Variables can be defined inline as well.
const { data } = await updatePublicMessage({ id: ..., messageContent: ..., isEdited: ..., isDeleted: ..., reactions: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updatePublicMessage(dataConnect, updatePublicMessageVars);

console.log(data.publicMessage_update);

// Or, you can use the `Promise` API.
updatePublicMessage(updatePublicMessageVars).then((response) => {
  const data = response.data;
  console.log(data.publicMessage_update);
});
```

### Using `UpdatePublicMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updatePublicMessageRef, UpdatePublicMessageVariables } from '@dypu-connect/dataconnect';

// The `UpdatePublicMessage` mutation requires an argument of type `UpdatePublicMessageVariables`:
const updatePublicMessageVars: UpdatePublicMessageVariables = {
  id: ..., 
  messageContent: ..., // optional
  isEdited: ..., // optional
  isDeleted: ..., // optional
  reactions: ..., // optional
};

// Call the `updatePublicMessageRef()` function to get a reference to the mutation.
const ref = updatePublicMessageRef(updatePublicMessageVars);
// Variables can be defined inline as well.
const ref = updatePublicMessageRef({ id: ..., messageContent: ..., isEdited: ..., isDeleted: ..., reactions: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updatePublicMessageRef(dataConnect, updatePublicMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.publicMessage_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.publicMessage_update);
});
```

## DeletePublicMessage
You can execute the `DeletePublicMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deletePublicMessage(vars: DeletePublicMessageVariables): MutationPromise<DeletePublicMessageData, DeletePublicMessageVariables>;

interface DeletePublicMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePublicMessageVariables): MutationRef<DeletePublicMessageData, DeletePublicMessageVariables>;
}
export const deletePublicMessageRef: DeletePublicMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deletePublicMessage(dc: DataConnect, vars: DeletePublicMessageVariables): MutationPromise<DeletePublicMessageData, DeletePublicMessageVariables>;

interface DeletePublicMessageRef {
  ...
  (dc: DataConnect, vars: DeletePublicMessageVariables): MutationRef<DeletePublicMessageData, DeletePublicMessageVariables>;
}
export const deletePublicMessageRef: DeletePublicMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deletePublicMessageRef:
```typescript
const name = deletePublicMessageRef.operationName;
console.log(name);
```

### Variables
The `DeletePublicMessage` mutation requires an argument of type `DeletePublicMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeletePublicMessageVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeletePublicMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeletePublicMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeletePublicMessageData {
  publicMessage_delete?: PublicMessage_Key | null;
}
```
### Using `DeletePublicMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deletePublicMessage, DeletePublicMessageVariables } from '@dypu-connect/dataconnect';

// The `DeletePublicMessage` mutation requires an argument of type `DeletePublicMessageVariables`:
const deletePublicMessageVars: DeletePublicMessageVariables = {
  id: ..., 
};

// Call the `deletePublicMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deletePublicMessage(deletePublicMessageVars);
// Variables can be defined inline as well.
const { data } = await deletePublicMessage({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deletePublicMessage(dataConnect, deletePublicMessageVars);

console.log(data.publicMessage_delete);

// Or, you can use the `Promise` API.
deletePublicMessage(deletePublicMessageVars).then((response) => {
  const data = response.data;
  console.log(data.publicMessage_delete);
});
```

### Using `DeletePublicMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deletePublicMessageRef, DeletePublicMessageVariables } from '@dypu-connect/dataconnect';

// The `DeletePublicMessage` mutation requires an argument of type `DeletePublicMessageVariables`:
const deletePublicMessageVars: DeletePublicMessageVariables = {
  id: ..., 
};

// Call the `deletePublicMessageRef()` function to get a reference to the mutation.
const ref = deletePublicMessageRef(deletePublicMessageVars);
// Variables can be defined inline as well.
const ref = deletePublicMessageRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deletePublicMessageRef(dataConnect, deletePublicMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.publicMessage_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.publicMessage_delete);
});
```

