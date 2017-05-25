import { ApolloServer } from 'apollo-server';
import { typeDefs } from './data/schema';

const PORT = 8080;

const server = new ApolloServer({ typeDefs, mocks: true });

server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
