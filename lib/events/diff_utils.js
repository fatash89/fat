'use babel';

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import walk from 'walk';
import dateFormat from "dateformat";
import {
    DIFF_SOURCE,
    DATETIME_FORMAT
} from "../constants";
import {generateSettings} from "../settings";
import {pathUtils} from "../utils/path_utils";


export function manageDiff(repoPath, branch, fileRelPath, diff, isNewFile = false,
                           isRename = false, isDeleted = false,
                           createdAt = "") {
    // Skip empty diffs
    if (!diff && !isNewFile && !isDeleted) {
        console.log(`Skipping: Empty diffs`);
        return;
    }

    const settings = generateSettings();

    if (!createdAt) {
        createdAt = dateFormat(new Date(), DATETIME_FORMAT);
    }
    // Add new diff in the buffer
    const newDiff = {};
    newDiff.source = DIFF_SOURCE;
    newDiff.created_at = createdAt;
    newDiff.diff = diff;
    newDiff.repo_path = repoPath;
    newDiff.branch = branch;
    newDiff.file_relative_path = fileRelPath;

    if (isNewFile) {
        newDiff.is_new_file = true;
    } else if (isRename) {
        newDiff.is_rename = true;
    } else if (isDeleted) {
        newDiff.is_deleted = true;
    }
    // Append new diff in the buffer
    const diffFilePath = path.join(settings.DIFFS_REPO, `${new Date().getTime()}.yml`);
    fs.writeFileSync(diffFilePath, yaml.safeDump(newDiff));
}


export const handleDirectoryRenameDiffs = async (repoPath, branch, diff) => {
    // For each nested file, create rename diff
    const diffJSON = JSON.parse(diff);
    // No need to skip repos here as it is for specific repo
    const walker = walk.walk(diffJSON.new_path);
    walker.on("file", function (root, fileStats, next) {
        const newFilePath = path.join(root, fileStats.name);
        const oldFilePath = newFilePath.replace(diffJSON.new_path, diffJSON.old_path);
        const oldRelPath = oldFilePath.split(path.join(repoPath, path.sep))[1];
        const newRelPath = newFilePath.split(path.join(repoPath, path.sep))[1];
        const diff = JSON.stringify({
            'old_rel_path': oldRelPath,
            'new_rel_path': newRelPath,
            'old_abs_path': oldFilePath,
            'new_abs_path': newFilePath
        });
        manageDiff(repoPath, branch, newRelPath, diff, false, true);
        next();
    });
};

export const handleDirectoryDeleteDiffs = async (repoPath, branch, dirRelPath) => {
    const pathUtilsObj = new pathUtils(repoPath, branch);
    const shadowRepoBranchPath = pathUtilsObj.getShadowRepoBranchPath();
    const shadowDirPath = path.join(shadowRepoBranchPath, dirRelPath);
    // No need to skip repos here as it is for specific repo
    const walker = walk.walk(shadowDirPath);
    walker.on("file", function (root, fileStats, next) {
        const filePath = path.join(root, fileStats.name);
        const relPath = filePath.split(path.join(pathUtilsObj.formattedRepoPath, branch, path.sep))[1];
        const cacheRepoBranchPath = pathUtilsObj.getDeletedRepoBranchPath();
        const cacheFilePath = path.join(cacheRepoBranchPath, relPath);
        const cacheDirectories = path.dirname(cacheFilePath);

        if (fs.existsSync(cacheFilePath)) {
            return;
        }
        // Create directories
        if (!fs.existsSync(cacheDirectories)) {
            // Add file in .deleted repo
            fs.mkdirSync(cacheDirectories, {recursive: true});
        }
        // File destination will be created or overwritten by default.
        fs.copyFileSync(filePath, cacheFilePath);
        manageDiff(repoPath, branch, relPath, "", false, false, true);
        next();
    });
};
