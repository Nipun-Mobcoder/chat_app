import { PubSub } from 'graphql-subscriptions';

let messages = [];
const pubsub = new PubSub();

const resolvers = {
    Query: {
        messages: () => {
            return messages;
        },
    },
    Mutation: {
        sendMessage: (parent, { nickname, message }) => {
          const newMessage = `${nickname}: ${message}`;
          messages.push(newMessage);
          pubsub.publish('MESSAGE_ADDED', { messageAdded: newMessage });
          return true;
        },
    },
    Subscription: {
      messageAdded: {
          subscribe: () => pubsub.asyncIterator(['MESSAGE_ADDED']),
        },
    }
  };

  export default resolvers;