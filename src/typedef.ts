const typeDefs = `
        type Query {
            messages: [String]
        }

        type Mutation {
            sendMessage(to: String!, message: String!): String
        }

        type Subscription {
            messageAdded: String
            showMessages(tokenId: String!): String
        }
    `
;

export default typeDefs;