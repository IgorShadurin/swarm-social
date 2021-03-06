class Photoalbum {
    constructor(main) {
        this.main = main;
        this.photoalbumInfo = {
            files: [],
            uploadedInfo: [],
            uploadedId: 0
        };

        this.init();
    }

    init() {
        let self = this;
        $('.upload-photos, .upload-photos-preview').click(function (e) {
            e.preventDefault();

            let input = $('#input-upload-photo-album');
            input.click();
        });

        $('body')
            .on('click', '.load-photoalbum', function (e) {
                e.preventDefault();
                let albumId = $(this).attr('data-album-id');
                let viewAlbumContent = $('#viewAlbumContent');
                $('.btn-delete-album').attr('data-album-id', albumId);
                let shownModals = $('.modal.show');
                if (shownModals.length) {
                    // todo move this logic to function and check if exists more simple method show modals when other hidden
                    shownModals.one('hidden.bs.modal', function (e) {
                        $('#viewAlbumModal').modal('show');
                    });
                    shownModals.modal('hide');
                } else {
                    $('#viewAlbumModal').modal('show');
                }

                viewAlbumContent.html(Utils.getTemplate('loaderTemplate'));
                self.main.blog.getAlbumInfo(albumId)
                    .then(function (response) {
                        let data = response.data;
                        viewAlbumContent.html('<ul id="preview-album" class="list-inline">');
                        data.photos.forEach(function (v) {
                            let template = self.getPreviewTemplate(albumId, v, 'img-fluid preview-album-photo');
                            template = $('<li class="list-inline-item"</li>').append(template);
                            viewAlbumContent.append(template);
                        });
                        viewAlbumContent.append('</ul>');
                    });
            })
            // todo move to post module
            .on('click', '.delete-post-content', function (e) {
                let postId = $(this).attr('data-post-id');
                let attachmentId = $(this).attr('data-attachment-id');
                let url = $(this).attr('data-url');

                if (confirm('Really delete?')) {
                    if (url) {
                        let content = $('.post-attachment[data-url="' + url + '"]');
                        content.hide('slow', function () {
                            content.remove();
                        });
                        self.main.swarm.delete(url)
                            .then(function (response) {
                                self.main.onAfterHashChange(response.data, true);
                            });
                    } else {
                        $('.wall-attachment[data-post-id=' + postId + '][data-attachment-id=' + attachmentId + ']').hide('slow');
                        self.main.blog.deletePostAttachment(postId, attachmentId)
                            .then(function (response) {
                                self.main.onAfterHashChange(response.data, true);
                            });
                    }
                }
            });

        $('#input-upload-photo-album').on('change', function () {
            if (this.files && this.files.length > 0) {
                self.photoalbumInfo.files = Array.from(this.files);
                self.photoalbumInfo.uploadedInfo = [];
                self.photoalbumInfo.uploadedId = 1;
                self.sendNextFile();
            }
        });

        $('.show-all-photoalbums').click(function (e) {
            e.preventDefault();
            let albumsModal = $('#showAllPhotoalbumsModal');
            let content = albumsModal.find('.modal-body');
            albumsModal.modal('show');
            content.html('<div class="d-flex justify-content-center"><div class="loader-animation"></div></div>');
            self.main.blog.getPhotoAlbumsInfo()
                .then(function (response) {
                    let data = response.data;
                    data = data || [];
                    data.reverse();
                    if (data.length) {
                        let html = '<ul class="list-inline preview-images">';
                        data.forEach(function (v) {
                            let imgUrl = self.main.swarm.getFullUrl(v.cover_file.file);
                            if ('previews' in v.cover_file) {
                                imgUrl = self.main.swarm.getFullUrl(v.cover_file.previews['250x250']);
                            }

                            html += '<li class="list-inline-item"><a href="#" class="load-photoalbum" data-album-id="' + v.id + '"><img class="preview-album-photo" src="' + imgUrl + '">' + '</a></li>';
                        });
                        html += '</ul>';
                        content.html(html);
                    } else {
                        content.html('<p>Albums not found</p>');
                    }
                })
                .catch(function () {
                    content.html('<p>Albums not found</p>');
                });
        });
    }

    sendNextFile() {
        let self = this;
        if (this.photoalbumInfo.files.length <= 0) {
            return;
        }

        let currentPhotoalbum = self.main.blog.myProfile.last_photoalbum_id + 1;
        let currentFile = this.photoalbumInfo.files.shift();
        currentFile = currentFile.slice(0, currentFile.size, currentFile.type);
        let progressPanel = $('#progressPanelAlbum');
        let postProgress = $('#postProgressAlbum');
        progressPanel.show();
        let setProgress = function (val) {
            postProgress.css('width', val + '%').attr('aria-valuenow', val);
        };
        let updateProgress = function (progress) {
            let onePercent = progress.total / 100;
            let currentPercent = progress.loaded / onePercent;
            setProgress(currentPercent);
        };
        let uploadPhoto = function (file, postfix) {
            postfix = postfix || '';
            return self.main.blog.uploadPhotoToAlbum(currentPhotoalbum, self.photoalbumInfo.uploadedId + postfix, file, updateProgress);
        };

        let key = '250x250';
        let keyBigPreview = '1200x800';
        let previewFileName = null;
        let bigPreviewFileName = null;
        let allPreviews = null;
        Utils.resizeImages(currentFile, [
            {width: 250, height: 250, format: 'box'},
            {width: 1200, height: 800, format: "maxsize"}
        ])
            .then(function (previews) {
                allPreviews = previews;
                let image1200 = allPreviews[keyBigPreview];
                return uploadPhoto(image1200, '_' + keyBigPreview);
            })
            .then(function (data) {
                self.main.onAfterHashChange(data.response, true);
                bigPreviewFileName = data.fileName;
                let image250 = allPreviews[key];
                return uploadPhoto(image250, '_' + key);
            })
            .then(function (data) {
                previewFileName = data.fileName;
                self.main.onAfterHashChange(data.response, true);
                return uploadPhoto(currentFile);
            })
            .then(function (data) {
                console.log(data);
                self.photoalbumInfo.uploadedId++;
                self.main.onAfterHashChange(data.response, true);
                progressPanel.hide();
                setProgress(0);
                self.photoalbumInfo.uploadedInfo.push({
                    file: data.fileName,
                    description: "",
                    previews: {
                        '250x250': previewFileName,
                        '1200x800': bigPreviewFileName
                    }
                });

                if (self.photoalbumInfo.files.length > 0) {
                    self.sendNextFile();
                } else {
                    self.main.blog.createPhotoAlbum(currentPhotoalbum, 'Uploaded', '', self.photoalbumInfo.uploadedInfo)
                        .then(function (response) {
                            console.log('album created');
                            console.log(response.data);
                            $('#newAlbumModal').modal('hide');
                            self.main.alert('Album created!', [
                                '<button type="button" class="btn btn-success btn-share-item" data-type="photoalbum" data-message="Just created new photoalbum!" data-id="' + currentPhotoalbum + '">Share</button>'
                            ]);
                            self.main.onAfterHashChange(response.data, true);
                        });
                }
            });
    }

    getPreviewTemplate(albumId, previewObject, imgClasses) {
        let self = this;
        let previewSrc = self.main.swarm.getFullUrl(previewObject.file ? previewObject.file : previewObject.url);
        let originalSrc = previewSrc;
        let bigSrc = previewSrc;
        if ('previews' in previewObject) {
            if ('250x250' in previewObject.previews) {
                previewSrc = self.main.swarm.getFullUrl(previewObject.previews['250x250']);
            }

            if ('1200x800' in previewObject.previews) {
                bigSrc = self.main.swarm.getFullUrl(previewObject.previews['1200x800']);
            }
        }

        return Utils.getTemplate('photoAlbumPreviewTemplate', {
            bigSrc: bigSrc,
            originalSrc: originalSrc,
            description: previewObject.description ? previewObject.description : '',
            albumId: albumId,
            previewSrc: previewSrc,
            imgClasses: imgClasses
        });
    }
}

module.exports = Photoalbum;