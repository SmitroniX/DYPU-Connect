import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Comment_Key {
  id: UUIDString;
  __typename?: 'Comment_Key';
}

export interface DeleteDirectMessageData {
  directMessage_delete?: DirectMessage_Key | null;
}

export interface DeleteDirectMessageVariables {
  id: UUIDString;
}

export interface DeleteGroupMessageData {
  groupMessage_delete?: GroupMessage_Key | null;
}

export interface DeleteGroupMessageVariables {
  id: UUIDString;
}

export interface DeletePublicMessageData {
  publicMessage_delete?: PublicMessage_Key | null;
}

export interface DeletePublicMessageVariables {
  id: UUIDString;
}

export interface DirectMessage_Key {
  id: UUIDString;
  __typename?: 'DirectMessage_Key';
}

export interface GroupMessage_Key {
  id: UUIDString;
  __typename?: 'GroupMessage_Key';
}

export interface Group_Key {
  name: string;
  __typename?: 'Group_Key';
}

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

export interface ListDirectMessagesVariables {
  currentUserId: string;
  otherUserId: string;
}

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

export interface ListGroupMessagesVariables {
  groupName: string;
}

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

export interface ListPublicMessagesVariables {
  now: TimestampString;
}

export interface Membership_Key {
  studentStudentId: string;
  groupName: string;
  __typename?: 'Membership_Key';
}

export interface Post_Key {
  id: UUIDString;
  __typename?: 'Post_Key';
}

export interface PublicMessage_Key {
  id: UUIDString;
  __typename?: 'PublicMessage_Key';
}

export interface SendDirectMessageData {
  directMessage_insert: DirectMessage_Key;
}

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

export interface SendGroupMessageData {
  groupMessage_insert: GroupMessage_Key;
}

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

export interface SendPublicMessageData {
  publicMessage_insert: PublicMessage_Key;
}

export interface SendPublicMessageVariables {
  senderId: string;
  messageContent: string;
  imageUrl?: string | null;
  blurHash?: string | null;
  gifUrl?: string | null;
  audioUrl?: string | null;
  expiresAt: TimestampString;
}

export interface Student_Key {
  studentId: string;
  __typename?: 'Student_Key';
}

export interface UpdateDirectMessageData {
  directMessage_update?: DirectMessage_Key | null;
}

export interface UpdateDirectMessageVariables {
  id: UUIDString;
  messageContent?: string | null;
  isEdited?: boolean | null;
  isDeleted?: boolean | null;
  reactions?: unknown | null;
}

export interface UpdateGroupMessageData {
  groupMessage_update?: GroupMessage_Key | null;
}

export interface UpdateGroupMessageVariables {
  id: UUIDString;
  messageContent?: string | null;
  isEdited?: boolean | null;
  isDeleted?: boolean | null;
  reactions?: unknown | null;
}

export interface UpdatePublicMessageData {
  publicMessage_update?: PublicMessage_Key | null;
}

export interface UpdatePublicMessageVariables {
  id: UUIDString;
  messageContent?: string | null;
  isEdited?: boolean | null;
  isDeleted?: boolean | null;
  reactions?: unknown | null;
}

interface SendDirectMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SendDirectMessageVariables): MutationRef<SendDirectMessageData, SendDirectMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SendDirectMessageVariables): MutationRef<SendDirectMessageData, SendDirectMessageVariables>;
  operationName: string;
}
export const sendDirectMessageRef: SendDirectMessageRef;

export function sendDirectMessage(vars: SendDirectMessageVariables): MutationPromise<SendDirectMessageData, SendDirectMessageVariables>;
export function sendDirectMessage(dc: DataConnect, vars: SendDirectMessageVariables): MutationPromise<SendDirectMessageData, SendDirectMessageVariables>;

interface ListDirectMessagesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDirectMessagesVariables): QueryRef<ListDirectMessagesData, ListDirectMessagesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListDirectMessagesVariables): QueryRef<ListDirectMessagesData, ListDirectMessagesVariables>;
  operationName: string;
}
export const listDirectMessagesRef: ListDirectMessagesRef;

export function listDirectMessages(vars: ListDirectMessagesVariables): QueryPromise<ListDirectMessagesData, ListDirectMessagesVariables>;
export function listDirectMessages(dc: DataConnect, vars: ListDirectMessagesVariables): QueryPromise<ListDirectMessagesData, ListDirectMessagesVariables>;

interface UpdateDirectMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateDirectMessageVariables): MutationRef<UpdateDirectMessageData, UpdateDirectMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateDirectMessageVariables): MutationRef<UpdateDirectMessageData, UpdateDirectMessageVariables>;
  operationName: string;
}
export const updateDirectMessageRef: UpdateDirectMessageRef;

export function updateDirectMessage(vars: UpdateDirectMessageVariables): MutationPromise<UpdateDirectMessageData, UpdateDirectMessageVariables>;
export function updateDirectMessage(dc: DataConnect, vars: UpdateDirectMessageVariables): MutationPromise<UpdateDirectMessageData, UpdateDirectMessageVariables>;

interface DeleteDirectMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteDirectMessageVariables): MutationRef<DeleteDirectMessageData, DeleteDirectMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteDirectMessageVariables): MutationRef<DeleteDirectMessageData, DeleteDirectMessageVariables>;
  operationName: string;
}
export const deleteDirectMessageRef: DeleteDirectMessageRef;

export function deleteDirectMessage(vars: DeleteDirectMessageVariables): MutationPromise<DeleteDirectMessageData, DeleteDirectMessageVariables>;
export function deleteDirectMessage(dc: DataConnect, vars: DeleteDirectMessageVariables): MutationPromise<DeleteDirectMessageData, DeleteDirectMessageVariables>;

interface SendGroupMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SendGroupMessageVariables): MutationRef<SendGroupMessageData, SendGroupMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SendGroupMessageVariables): MutationRef<SendGroupMessageData, SendGroupMessageVariables>;
  operationName: string;
}
export const sendGroupMessageRef: SendGroupMessageRef;

export function sendGroupMessage(vars: SendGroupMessageVariables): MutationPromise<SendGroupMessageData, SendGroupMessageVariables>;
export function sendGroupMessage(dc: DataConnect, vars: SendGroupMessageVariables): MutationPromise<SendGroupMessageData, SendGroupMessageVariables>;

interface ListGroupMessagesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListGroupMessagesVariables): QueryRef<ListGroupMessagesData, ListGroupMessagesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListGroupMessagesVariables): QueryRef<ListGroupMessagesData, ListGroupMessagesVariables>;
  operationName: string;
}
export const listGroupMessagesRef: ListGroupMessagesRef;

export function listGroupMessages(vars: ListGroupMessagesVariables): QueryPromise<ListGroupMessagesData, ListGroupMessagesVariables>;
export function listGroupMessages(dc: DataConnect, vars: ListGroupMessagesVariables): QueryPromise<ListGroupMessagesData, ListGroupMessagesVariables>;

interface UpdateGroupMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateGroupMessageVariables): MutationRef<UpdateGroupMessageData, UpdateGroupMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateGroupMessageVariables): MutationRef<UpdateGroupMessageData, UpdateGroupMessageVariables>;
  operationName: string;
}
export const updateGroupMessageRef: UpdateGroupMessageRef;

export function updateGroupMessage(vars: UpdateGroupMessageVariables): MutationPromise<UpdateGroupMessageData, UpdateGroupMessageVariables>;
export function updateGroupMessage(dc: DataConnect, vars: UpdateGroupMessageVariables): MutationPromise<UpdateGroupMessageData, UpdateGroupMessageVariables>;

interface DeleteGroupMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteGroupMessageVariables): MutationRef<DeleteGroupMessageData, DeleteGroupMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteGroupMessageVariables): MutationRef<DeleteGroupMessageData, DeleteGroupMessageVariables>;
  operationName: string;
}
export const deleteGroupMessageRef: DeleteGroupMessageRef;

export function deleteGroupMessage(vars: DeleteGroupMessageVariables): MutationPromise<DeleteGroupMessageData, DeleteGroupMessageVariables>;
export function deleteGroupMessage(dc: DataConnect, vars: DeleteGroupMessageVariables): MutationPromise<DeleteGroupMessageData, DeleteGroupMessageVariables>;

interface SendPublicMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SendPublicMessageVariables): MutationRef<SendPublicMessageData, SendPublicMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SendPublicMessageVariables): MutationRef<SendPublicMessageData, SendPublicMessageVariables>;
  operationName: string;
}
export const sendPublicMessageRef: SendPublicMessageRef;

export function sendPublicMessage(vars: SendPublicMessageVariables): MutationPromise<SendPublicMessageData, SendPublicMessageVariables>;
export function sendPublicMessage(dc: DataConnect, vars: SendPublicMessageVariables): MutationPromise<SendPublicMessageData, SendPublicMessageVariables>;

interface ListPublicMessagesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPublicMessagesVariables): QueryRef<ListPublicMessagesData, ListPublicMessagesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListPublicMessagesVariables): QueryRef<ListPublicMessagesData, ListPublicMessagesVariables>;
  operationName: string;
}
export const listPublicMessagesRef: ListPublicMessagesRef;

export function listPublicMessages(vars: ListPublicMessagesVariables): QueryPromise<ListPublicMessagesData, ListPublicMessagesVariables>;
export function listPublicMessages(dc: DataConnect, vars: ListPublicMessagesVariables): QueryPromise<ListPublicMessagesData, ListPublicMessagesVariables>;

interface UpdatePublicMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdatePublicMessageVariables): MutationRef<UpdatePublicMessageData, UpdatePublicMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdatePublicMessageVariables): MutationRef<UpdatePublicMessageData, UpdatePublicMessageVariables>;
  operationName: string;
}
export const updatePublicMessageRef: UpdatePublicMessageRef;

export function updatePublicMessage(vars: UpdatePublicMessageVariables): MutationPromise<UpdatePublicMessageData, UpdatePublicMessageVariables>;
export function updatePublicMessage(dc: DataConnect, vars: UpdatePublicMessageVariables): MutationPromise<UpdatePublicMessageData, UpdatePublicMessageVariables>;

interface DeletePublicMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePublicMessageVariables): MutationRef<DeletePublicMessageData, DeletePublicMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeletePublicMessageVariables): MutationRef<DeletePublicMessageData, DeletePublicMessageVariables>;
  operationName: string;
}
export const deletePublicMessageRef: DeletePublicMessageRef;

export function deletePublicMessage(vars: DeletePublicMessageVariables): MutationPromise<DeletePublicMessageData, DeletePublicMessageVariables>;
export function deletePublicMessage(dc: DataConnect, vars: DeletePublicMessageVariables): MutationPromise<DeletePublicMessageData, DeletePublicMessageVariables>;

