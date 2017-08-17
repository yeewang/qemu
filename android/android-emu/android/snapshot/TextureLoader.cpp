// Copyright 2017 The Android Open Source Project
//
// This software is licensed under the terms of the GNU General Public
// License version 2, as published by the Free Software Foundation, and
// may be copied, distributed, and modified under those terms.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

#include "android/snapshot/TextureLoader.h"

#include <assert.h>

namespace android {
namespace snapshot {

TextureLoader::TextureLoader(android::base::StdioStream&& stream)
    : mStream(std::move(stream)) {}

bool TextureLoader::start() {
    if (mStarted) {
        return !mHasError;
    }

    mStarted = true;
    bool res = readIndex();
    if (!res) {
        mHasError = true;
        return false;
    }
    return true;
}

void TextureLoader::loadTexture(uint32_t texId, const loader_t& loader) {
    android::base::AutoLock scopedLock(mLock);
    assert(mIndex.count(texId));
    fseek(mStream.get(), mIndex[texId], SEEK_SET);
    loader(&mStream);
    if (ferror(mStream.get())) {
        mHasError = true;
    }
}

bool TextureLoader::readIndex() {
#if SNAPSHOT_PROFILE > 1
    auto start = android::base::System::get()->getHighResTimeUs();
#endif
    assert(mIndex.size() == 0);
    auto indexPos = mStream.getBe64();
    fseek(mStream.get(), static_cast<int64_t>(indexPos), SEEK_SET);
    auto version = mStream.getBe32();
    if (version != 1) {
        return false;
    }
    uint32_t texCount = mStream.getBe32();
    mIndex.reserve(texCount);
    for (uint32_t i = 0; i < texCount; i++) {
        uint32_t tex = mStream.getBe32();
        uint64_t filePos = mStream.getBe64();
        mIndex.emplace(tex, filePos);
    }
#if SNAPSHOT_PROFILE > 1
    printf("Texture readIndex() time: %.03f\n",
           (android::base::System::get()->getHighResTimeUs() - start) / 1000.0);
#endif
    return true;
}

}  // namespace snapshot
}  // namespace android