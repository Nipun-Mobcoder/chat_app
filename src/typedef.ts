const typeDefs = `

    scalar Upload

    type Message {
        id: ID!
        sender: String
        message: String
        file: File
    }

    type File {
        filename: String
        mimetype: String
        url: String
    }

    type Query {
        messages: [Message]
    }

    type Mutation {
        sendMessage(to: String!, message: String, file: Upload): String
    }

    type Subscription {
        showMessages(tokenId: String!): Message
    }

`;

export default typeDefs;
