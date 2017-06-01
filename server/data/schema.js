import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';

import { Mocks } from './mocks';
import { Resolvers } from './resolvers';

export const Schema = [`
  # declare custom scalars
  scalar Date

  type MessageConnection {
    edges: [MessageEdge]
    pageInfo: PageInfo!
  }

  type MessageEdge {
    cursor: String!
    node: Message!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # a group chat entity
  type Group {
    id: Int! # unique id for the group
    name: String # name of the group
    users: [User]! # users in the group
    messages(first: Int, after: String, last: Int, before: String): MessageConnection # messages sent to the group
  }

  # a user -- keep type really simple for now
  type User {
    id: Int! # unique id for the user
    email: String! # we will also require a unique email per user
    username: String # this is the name we'll show other users
    messages: [Message] # messages sent by user
    groups: [Group] # groups the user belongs to
    friends: [User] # user's friends/contacts
  }

  # a message sent from a user to a group
  type Message {
    id: Int! # unique id for message
    to: Group! # group message was sent in
    from: User! # user who sent the message
    text: String! # message text
    createdAt: Date! # when message was created
  }

  # query for types
  type Query {
    # Return a user by their email or id
    user(email: String, id: Int): User

    # Return messages sent by a user via userId
    # Return messages sent to a group via groupId
    messages(groupId: Int, userId: Int): [Message]

    # Return a group by its id
    group(id: Int!): Group
  }

  type Mutation {
    # send a message to a group
    createMessage(
      text: String!, userId: Int!, groupId: Int!
    ): Message
    createGroup(name: String!, userIds: [Int], userId: Int!): Group
    deleteGroup(id: Int!): Group
    leaveGroup(id: Int!, userId: Int!): Group # let user leave group
    updateGroup(id: Int!, name: String): Group
  }

  type Subscription {
    # Subscription fires on every message added
    # for any of the groups with one of these groupIds
    messageAdded(userId: Int, groupIds: [Int]): Message
    groupAdded(userId: Int): Group
  }
  
  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`];

export const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers,
});

// addMockFunctionsToSchema({
//   schema: executableSchema,
//   mocks: Mocks,
//   preserveResolvers: true,
// });

export default executableSchema;
