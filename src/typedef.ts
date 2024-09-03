const typeDefs = `
        type Query {
            messages: [String]
        }

        type Mutation {
            sendMessage(nickname: String!, message: String!): Boolean
        }

        type Subscription {
            messageAdded: String
        }
    `
;

export default typeDefs;