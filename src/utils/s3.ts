import AWS from 'aws-sdk';
import crypto from 'crypto';
import config from '../config';

// Configurar AWS SDK
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

const s3 = new AWS.S3();

/**
 * Create a hash MD5 of a string
 */
function createHash(input: string): string {
  const secretSalt = "default_salt";
  return crypto
    .createHmac("sha256", secretSalt)
    .update(input)
    .digest("hex")
    .substring(0, 30);
}

/**
 * Upload an image to S3
 */
const pushImageToS3 = async (
  screenshotBuffer: Buffer,
  bucketName: string,
  path: string
) => {
  try {
    if (!bucketName) {
      throw new Error("S3_BUCKET_NAME is not defined in environment variables");
    }

    const params = {
      Bucket: bucketName,
      Key: path,
      Body: screenshotBuffer,
      ContentType: "image/jpeg",
    };

    const uploadResult = await s3.upload(params).promise();
    return uploadResult;
  } catch (error) {
    console.error("Error uploading images to S3: ", error);
    throw error;
  }
};

/**
 * Upload an image to S3 and return the URL
 */
async function uploadToS3(buffer: Buffer, bucketName: string, userId: string, productId: string): Promise<string> {
  console.log('Uploading image to S3...');
  const key = `${createHash(userId)}/${productId}/${Date.now()}.jpeg`;
  const result = await pushImageToS3(buffer, bucketName, key);
  console.log('Image uploaded successfully to S3...');
  return result.Location;
}

/**
 * Check if the bucket exists and is accessible
 */
async function checkBucketAccess(bucketName: string): Promise<boolean> {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log(`✅ Bucket ${bucketName} is accessible`);
    return true;
  } catch (error: any) {   
    console.error(`❌ Error accessing bucket ${bucketName}:`, error.message);
    return false;
  }
}

export {
  createHash,
  pushImageToS3,
  uploadToS3,
  checkBucketAccess,
};
