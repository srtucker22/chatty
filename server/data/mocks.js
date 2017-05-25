import faker from 'faker';

export const Mocks = {
  Date: () => new Date(),
  Int: () => parseInt(Math.random() * 100, 10),
  String: () => 'It works!',
  Query: () => ({
    user: (root, args) => ({
      email: args.email,
      messages: [{
        from: {
          email: args.email,
        },
      }],
    }),
  }),
  User: () => ({
    email: faker.internet.email(),
    username: faker.internet.userName(),
  }),
  Group: () => ({
    name: faker.lorem.words(Math.random() * 3),
  }),
  Message: () => ({
    text: faker.lorem.sentences(Math.random() * 3),
  }),
};

export default Mocks;
