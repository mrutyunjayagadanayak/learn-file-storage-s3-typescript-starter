import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";
import { join } from "path/posix";

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  // TODO: implement the upload here
  const formData = await req.formData();
  const imageData = formData.get("thumbnail");

  if (!(imageData instanceof File)) {
    throw new BadRequestError("Invalid thumbnail");
  }
  const MAX_UPLOAD_SIZE = 10_485_760;
  if (imageData.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError("Thumbnail size too big");
  }
  const mediaType = imageData.type

  const videoMetadata = getVideo(cfg.db, videoId);
  if (!videoMetadata) {
    throw new BadRequestError("No video found");
  }
  if (videoMetadata.userID !== userID) {
    throw new UserForbiddenError("Unauthorised user");
  }
  const fileExtension = mediaType.split("/")[1];
  const filePath = join(cfg.assetsRoot, `${videoId}.${fileExtension}`);
  await Bun.write(filePath, imageData);
  videoMetadata.thumbnailURL = `http://localhost:${cfg.port}/assets/${videoId}.${fileExtension}`;
  updateVideo(cfg.db, videoMetadata);
  return respondWithJSON(200, videoMetadata);
}
