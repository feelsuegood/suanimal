const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Initialize S3 client
const s3 = new AWS.S3();

// S3 configuration constants

const S3_CONFIG = {
  bucketName: "suanimal-s3",
  objectKey: "counter.json",
  initialData: {
    counter: 0,
  },
};

/**
 * Creates an S3 bucket if it doesn't exist
 * @returns {Promise<void>}
 * @throws {Error} If bucket creation fails for reasons other than bucket already existing
 */

async function createS3bucket() {
  try {
    await s3.createBucket({ Bucket: S3_CONFIG.bucketName }).promise();
    console.log(`Created bucket: ${S3_CONFIG.bucketName}`);
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`Bucket already exists: ${S3_CONFIG.bucketName}`);
    } else {
      console.log(`Error creating bucket: ${err}`);
    }
  }
}

/**
 * Initializes counter file in S3 bucket if it doesn't exist
 * @returns {Promise<void>}
 * @throws {Error} If file check or upload fails
 */
async function uploadJsonToS3() {
  const params = {
    Bucket: S3_CONFIG.bucketName,
    Key: S3_CONFIG.objectKey,
  };

  try {
    // Check if counter file already exists
    await s3.headObject(params).promise();
    console.log(
      `📣 Object with key ${S3_CONFIG.objectKey} already exists in bucket ${S3_CONFIG.bucketName}. Skip uploading.`,
    );
  } catch (err) {
    if (err.statusCode === 404) {
      // Create new counter file if it doesn't exist
      const uploadParams = {
        ...params,
        Body: JSON.stringify(S3_CONFIG.initialData), // Convert JSON to string
        ContentType: "application/json", // Set content type
      };
      await s3.putObject(uploadParams).promise();
      console.log("✅ Counter file initialized successfully");
    } else {
      // Handle other errors
      console.error("❌ Error checking counter file:", err);
    }
  }
}

/**
 * Retrieves current counter value from S3, increments it, and updates the file
 * @returns {Promise<number>} Updated counter value
 * @throws {Error} If counter retrieval or update fails
 */
async function getObjectAndUpdateCounter() {
  const params = {
    Bucket: S3_CONFIG.bucketName,
    Key: S3_CONFIG.objectKey,
  };

  try {
    // Get current counter value and parse JSON content from S3 object
    const data = await s3.getObject(params).promise();
    const parsedData = JSON.parse(data.Body.toString("utf-8"));

    // Increment the counter
    const updatedData = { counter: parsedData.counter++ };

    // Upload the updated JSON back to S3
    const updatedParams = {
      ...params,
      Body: JSON.stringify(updatedData), // Convert JSON to string
      ContentType: "application/json", // Set content type
    };

    await s3.putObject(updatedParams).promise();
    console.log(`✅ Counter updated to: ${updatedData.counter}`);

    // Return the updated counter value
    return parsedData.counter;
  } catch (err) {
    // Return an error value or handle the error as needed
    console.error("❌ Error updating counter: ", err);
    throw err;
  }
}

module.exports = {
  createS3bucket,
  uploadJsonToS3,
  getObjectAndUpdateCounter,
};
