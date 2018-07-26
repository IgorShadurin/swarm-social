let swarm;
let blog;
$(document).ready(function () {
    // hash - user id
    // chernish - 6f364876a50f1b4438faf5281df4af4ac04aafff8b688fe90ff503b9234e2e71
    //swarm = new SwarmApi("http://127.0.0.1:8500", "202a740db9d1442099a906bb69d2660422949c3244da4797a0aacf13c754dc35");
    console.log('current hash');
    console.log(localStorage.getItem('applicationHash'));
    //swarm = new SwarmApi("http://127.0.0.1:8500", localStorage.getItem('applicationHash'));
    swarm = new SwarmApi("https://swarm-gateways.net", localStorage.getItem('applicationHash'));
    blog = new Blog(swarm);
    if (swarm.applicationHash) {
        blog.getMyProfile()
            .then(function (response) {
                // handle success
                let data = response.data;

                console.log(data);
                // todo autoset profile after update?
                blog.setMyProfile(data);
                updateInfo(data)
            })
            .catch(function (error) {
                // handle error
                //console.log(error);
                console.log('Some error happen');
            })
            .then(function () {
                // always executed
            });
    } else {
        $('#userInfo').hide();
        $('#mainMenu').click();
    }

    init();
});

function init() {
    $('.publish-post').click(function (e) {
        e.preventDefault();
        let postContentElement = $('#postContent');
        let text = postContentElement.val();
        console.log(text);
        // todo block post button and create wait animation
        blog.createPost(blog.myProfile.last_post_id + 1, text)
            .then(function (response) {
                swarm.applicationHash = response.data;
                console.log(response.data);
                postContentElement.val('');
                localStorage.setItem('applicationHash', response.data);
                location.reload();
            })
            .catch(function (error) {
                console.log('Some error happen');
            })
            .then(function () {
                // always executed
            });
    });

    $('.go-user-hash').click(function (e) {
        e.preventDefault();

        let userHash = $('#navigateUserHash').val();
        swarm.applicationHash = userHash;
        localStorage.setItem('applicationHash', userHash);
        // todo check it before load
        console.log(userHash);
        blog.getProfile(userHash)
            .then(function (response) {
                // handle success
                console.log(response.data);
                updateInfo(response.data);
                $('#userInfo').show();
                $('#mainMenu').click();
                location.reload();

            })
            .catch(function (error) {
                // handle error
                //console.log(error);
                console.log('Some error happen');
            })
            .then(function () {
                // always executed
            });
    });

    $('.edit-page-info').click(function (e) {
        //e.preventDefault();
        // todo load user info
        let info = blog.myProfile;
        $('#firstNameEdit').val(info.first_name);
        $('#lastNameEdit').val(info.last_name);
        $('#birthDateEdit').val(info.birth_date);
        $('#locationEdit').val(info.location.name);
        $('#aboutEdit').val(info.about);
    });

    $('.save-info-changes').click(function () {
        // todo save and close
        let info = blog.myProfile;
        info.first_name = $('#firstNameEdit').val();
        info.last_name = $('#lastNameEdit').val();
        info.birth_date = $('#birthDateEdit').val();
        info.location.name = $('#locationEdit').val();
        info.about = $('#aboutEdit').val();

        // todo show wait animation
        blog.saveProfile(info).then(function (response) {
            console.log(response.data);
            localStorage.setItem('applicationHash', response.data);

            $('#editInfoModal').modal('hide');
            location.reload();
        });
    });
}

function updateInfo(data) {
    $('#firstName').text(data.first_name);
    $('#lastName').text(data.last_name);
    $('#birthDate').text(data.birth_date);
    if (data.location && data.location.name) {
        $('#locationName').text(data.location.name);
    }

    if (data.photo && data.photo.big_avatar) {
        $('#bigAvatar').attr('src', data.photo.big_avatar);
    }

    $('#about').text(data.about);
    //$('#lastPostId').text(data.last_post_id);
    if (data.last_post_id > 0) {
        let userPostTemplate = $('#userPost');
        let userPosts = $('#userPosts');
        //let maxPosts = Math.min(data.last_post_id, 10);
        for (let i = data.last_post_id; i > 0; i--) {
            //userPosts.append('<p>111</p>')
            userPosts.append(userPostTemplate.clone().attr('id', 'userPost' + i).attr('style', '').attr('data-id', i).html('Loading...'));
            blog.getPost(i, swarm.applicationHash).then(function (response) {
                let data = response.data;
                //console.log(data);
                $('#userPost' + data.id).text(data.description);
            });
        }
    }
}