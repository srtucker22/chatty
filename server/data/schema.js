import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';

import { Mocks } from './mocks';
import { Resolvers } from './resolvers';

export const Schema = [`
  # declare custom scalars
  scalar Date

  # input for file types
  input File {
    name: String!
    type: String!
    size: Int!
    path: String!
  }

  # input for creating messages
  input CreateMessageInput {
    groupId: Int!
    text: String!
  }

  # input for creating groups
  input CreateGroupInput {
    name: String!
    userIds: [Int!]
    icon: File # group icon image
  }

  # input for updating followed
  input UpdateFollowedInput {
    followedId: Int!
    userId: Int!
  }

  # input for searching users
  input UsersSearchInput {
    id: Int!
    usernameString: String # at least 3 characters
  }

  # input for updating groups
  input UpdateGroupInput {
    id: Int!
    lastRead: Int
    name: String
    userIds: [Int!]
    icon: File # group icom image
  }

  # input for signing in users
  input SigninUserInput {
    email: String!
    password: String!
    username: String
  }

  # input for updating users
  input UpdateUserInput {
    avatar: File
    badgeCount: Int
    username: String
    registrationId: String
  }

  # input for relay cursor connections
  input ConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
  }

  type MessageConnection {
    edges: [MessageEdge]
    pageInfo: PageInfo!
  }

  type MessageEdge {
    cursor: String!
    node: Message!
  }

  type FeedConnection {
    edges: [FeedEdge]
    pageInfo: PageInfo!
  }

  type FeedEdge {
    cursor: String!
    node: Tweet!
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
    messages(messageConnection: ConnectionInput): MessageConnection # messages sent to the group
    lastRead: Message # message last read by user
    unreadCount: Int # number of unread messages by user
    icon: String # url for icon image
  }

  # a user -- keep type really simple for now
  type User {
    id: Int! # unique id for the user
    badgeCount: Int # number of unread notifications
    email: String! # we will also require a unique email per user
    username: String # this is the name we'll show other users
    firstName: String
    lastName: String
    messages: [Message] # messages sent by user
    groups: [Group] # groups the user belongs to
    tweets: [Tweet] # tweets the user authored
    friends: [User] # user's friends/contacts
    followeds: [User] # all being followed by this user
    followedsTweetFeed(feedConnection: ConnectionInput): FeedConnection # feed of followeds' tweets
    followersTweetFeed(feedConnection: ConnectionInput): FeedConnection # feed of followeds' tweets
    followers: [User] # all following this user
    followedsCount: Int
    followersCount: Int
    jwt: String # json web token for access
    registrationId: String
    avatar: String # url for avatar image
  }

  # a message sent from a user to a group
  type Message {
    id: Int! # unique id for message
    to: Group! # group message was sent in
    from: User! # user who sent the message
    text: String! # message text
    createdAt: Date! # when message was created
  }

  # a message sent from a user to a group
  type Tweet {
    id: Int! # unique id for message
    author: User # tweet's author
    text: String! # message text
    createdAt: Date! # when message was created
  }

  # query for types
  type Query {
    # Return a user by their email or id
    user(email: String, id: Int): User
  
    # Return another user by their email or id
    username(id: Int, usernameId: Int): User

    # Search all users by their username
    users(id: Int, usernameString: String): [User]

    # Return messages sent by a user via userId
    # Return messages sent to a group via groupId
    messages(groupId: Int, userId: Int): [Message]

    # Return a group by its id
    group(id: Int!): Group
  }

  type Mutation {
    # send a message to a group
    createMessage(message: CreateMessageInput!): Message
    createGroup(group: CreateGroupInput!): Group
    updateFollowed(user: UpdateFollowedInput!): User
    deleteGroup(id: Int!): Group
    leaveGroup(id: Int!): Group # let user leave group
    updateGroup(group: UpdateGroupInput!): Group
    updateUser(user: UpdateUserInput!): User # update registration for user
    login(user: SigninUserInput!): User
    signup(user: SigninUserInput!): User
  }

  type Subscription {
    # Subscription fires on every message added
    # for any of the groups with one of these groupIds
    messageAdded(groupIds: [Int]): Message
    groupAdded(userId: Int): Group
    followedAdded(userId: Int!): User
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
