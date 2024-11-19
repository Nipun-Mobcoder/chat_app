import Group from "../models/Group.js";
import Message from "../models/Message.js";
import { getUserFromToken } from "./jwt.js";
import pubsub from "./pubsub.js";
import { getPresignedUrl, s3 } from "./s3.js";

const sendFileGroup = async (context: {token: string}, fileName: string, uploadId: string, parts: any, to: string) => {
    try {
        const userData: { id: string, userName: string } = await getUserFromToken(context.token);
        const { id, userName } = userData;

        const groupDetails = await Group.findOne({ _id: to });
        if(!groupDetails) throw new Error("Group doesn't exist.");

        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts.map((part: { etag: any; }, index: number) => ({
                ETag: part.etag,
                PartNumber: index + 1,
                })),
            },
        };

        const data = await s3.completeMultipartUpload(params).promise();
        const fileUrl = data.Location;
        const presignedUrl = await getPresignedUrl(data.Key);
        const newMessage = {
            id,
            sender: userName,
            message: '',
            file: {
                filename: fileName,
                mimetype: 'video/mp4',
                url: presignedUrl,
            },
            to,
        };

        pubsub.publish('FILE_ADDED', {
            showMessages: newMessage,
            showUsersMessages: newMessage,
            to,
            id,
            isGroup: true
        });

        await Message.create({
            sender: id,
            message: '',
            to,
            senderName: userName,
            file: {
                filename: fileName,
                url: fileUrl,
            },
        });

        return "Message sent successfully";
        } catch (error) {
            throw new Error(error?.message ?? "Failed to complete multipart upload.");
        }
}

export default sendFileGroup;