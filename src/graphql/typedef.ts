const typeDefs = `

    scalar Upload

    type Message {
        id: ID!
        sender: String
        message: String
        file: File
    }

    type User {
        userName: String!
        email: String!
    }

    type File {
        filename: String
        mimetype: String
        url: String
    }

    input PartType {
        etag: String!
        PartNumber: Int!
    }

    type Result {
        status: Int
    }

    type Query {
        messages: [Message]
        login(email: String!, password: String!): String
        startMultipart(fileName: String!, contentType: String!): String
        generateMultipart(fileName: String!, uploadId: String!, partNumbers: Int!): [String]
    }

    type Mutation {
        register(userName: String!, email: String!, password: String!): User
        sendMessage(to: String!, message: String, file: Upload): String
        complete(fileName: String!, uploadId: String!, parts: [PartType!]!, to: String!): String
    }

    type Subscription {
        showMessages(tokenId: String!): Message
    }

`;

export default typeDefs;
