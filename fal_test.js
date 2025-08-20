import { fal } from "@fal-ai/client";
import dotenv from 'dotenv';
dotenv.config();    

async function main() {
  // Initialize FAL client
  console.log(process.env.FAL_KEY);
  fal.config({
    credentials: process.env.FAL_KEY
  });

  const model = "fal-ai/bytedance/seedance/v1/pro/image-to-video";
  const input = {
    prompt: "A skier glides over fresh snow, joyously smiling while kicking up large clouds of snow as he turns. Accelerating gradually down the slope, the camera moves smoothly alongside.",
    image_url: "https://storage.googleapis.com/falserverless/example_inputs/seedance_pro_i2v_img.jpg"
  };

  // Submit the request
  const { request_id } = await fal.queue.submit(model, {
    input,
  });

  // Poll for status until completed
  let status;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes at 5s interval

  do {
    await new Promise(resolve => setTimeout(resolve, 5000));
    status = await fal.queue.status(model, {
      requestId: request_id,
      logs: true
    });
    console.log(`Status: ${status.status}`);
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error("Timed out waiting for FAL result");
    }
  } while (status.status === "IN_PROGRESS" || status.status === "IN_QUEUE");

  if (status.status !== "COMPLETED") {
    throw new Error(`Request failed with status: ${status.status}`);
  }

  // Get the result
  const result = await fal.queue.result(model, {
    requestId: request_id
  });

  console.log(result.data);
  console.log(result.requestId);
}

main().catch(err => {
  console.error("Error:", err);
});