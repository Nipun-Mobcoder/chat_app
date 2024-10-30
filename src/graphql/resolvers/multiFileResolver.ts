import { s3 } from '../../utils/s3.js';
import { GraphQLUpload } from "graphql-upload-ts";

const multiFileResolver = {
  Upload: GraphQLUpload,
  Query: {
    startMultipart: async (_: any, { fileName, contentType }, context: { token: string }) => {
      try {
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          ContentDisposition: contentType === "VIDEO" ? "inline" : "attachment",
          ContentType: contentType === "VIDEO" ? "video/mp4" : "application/octet-stream",
        };
  
        const multipart = await s3.createMultipartUpload(params).promise();
        return multipart.UploadId;
      } catch (error) {
        console.log(error);
        throw new Error(error?.message ?? "Looks like something went wrong.");
      }
    },

    generateMultipart: async (_: any, { fileName, uploadId, partNumbers }, context: { token: string }) => {
      const totalParts = Array.from({ length: partNumbers }, (_, i) => i + 1);

      const presignedUrls = await Promise.all(
        totalParts.map(async (partNumber) => {
          const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            PartNumber: partNumber,
            UploadId: uploadId,
            Expires: 60 * 60,
          };

          return s3.getSignedUrl("uploadPart", params);
        })
      );

      return presignedUrls;
    },
  },
};

export default multiFileResolver;
