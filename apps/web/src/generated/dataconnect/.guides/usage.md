# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { sendDirectMessage, listDirectMessages, updateDirectMessage, deleteDirectMessage, sendGroupMessage, listGroupMessages, updateGroupMessage, deleteGroupMessage, sendPublicMessage, listPublicMessages } from '@dypu-connect/dataconnect';


// Operation SendDirectMessage:  For variables, look at type SendDirectMessageVars in ../index.d.ts
const { data } = await SendDirectMessage(dataConnect, sendDirectMessageVars);

// Operation ListDirectMessages:  For variables, look at type ListDirectMessagesVars in ../index.d.ts
const { data } = await ListDirectMessages(dataConnect, listDirectMessagesVars);

// Operation UpdateDirectMessage:  For variables, look at type UpdateDirectMessageVars in ../index.d.ts
const { data } = await UpdateDirectMessage(dataConnect, updateDirectMessageVars);

// Operation DeleteDirectMessage:  For variables, look at type DeleteDirectMessageVars in ../index.d.ts
const { data } = await DeleteDirectMessage(dataConnect, deleteDirectMessageVars);

// Operation SendGroupMessage:  For variables, look at type SendGroupMessageVars in ../index.d.ts
const { data } = await SendGroupMessage(dataConnect, sendGroupMessageVars);

// Operation ListGroupMessages:  For variables, look at type ListGroupMessagesVars in ../index.d.ts
const { data } = await ListGroupMessages(dataConnect, listGroupMessagesVars);

// Operation UpdateGroupMessage:  For variables, look at type UpdateGroupMessageVars in ../index.d.ts
const { data } = await UpdateGroupMessage(dataConnect, updateGroupMessageVars);

// Operation DeleteGroupMessage:  For variables, look at type DeleteGroupMessageVars in ../index.d.ts
const { data } = await DeleteGroupMessage(dataConnect, deleteGroupMessageVars);

// Operation SendPublicMessage:  For variables, look at type SendPublicMessageVars in ../index.d.ts
const { data } = await SendPublicMessage(dataConnect, sendPublicMessageVars);

// Operation ListPublicMessages:  For variables, look at type ListPublicMessagesVars in ../index.d.ts
const { data } = await ListPublicMessages(dataConnect, listPublicMessagesVars);


```