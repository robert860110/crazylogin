$(document).ready(function($) {
    var formModal = $('.cd-user-modal'),
        formLogin = formModal.find('#cd-login'),
        formSignup = formModal.find('#cd-signup'),
        formForgotPassword = formModal.find('#cd-reset-password'),
        buttonLogin = formLogin.find('#button-login'),
        buttonSignup = formSignup.find('#button-signup'),
        buttonResend = formForgotPassword.find('#button-resend'),

        formModalTab = $('.cd-switcher'),
        tabLogin = formModalTab.children('li').eq(0).children('a'),
        tabSignup = formModalTab.children('li').eq(1).children('a'),
        forgotPasswordLink = formLogin.find('.cd-form-bottom-message a'),
        backToLoginLink = formForgotPassword.find('.cd-form-bottom-message a'),
        mainNav = $('.main-nav');

    formModal.addClass('is-visible');
    formLogin.addClass('is-selected');
    formSignup.removeClass('is-selected');
    formForgotPassword.removeClass('is-selected');
    tabLogin.addClass('selected');
    tabSignup.removeClass('selected');

    // //open sign-up form
    // mainNav.on('click', '.cd-signup', signup_selected);
    // //open login-form form
    // mainNav.on('click', '.cd-signin', login_selected);

    // // show the confirmation code input field

    // mainNav.click(function() {
    //     $('.confirmationCode-login').css("display", "none");
    //     $('.confirmationCode-signup').css("display", "none");
    //     buttonLogin.val("Send Confirmation Code");
    //     buttonSignup.val("Send Confirmation Code");
    // });


    // Click SignUp button
    buttonSignup.click(function(e) {

        e.preventDefault();
        var data = {};
        data.email = $('#signup-email').val();
        data.phone_number = $('#signup-phone').val();


        if ($(this).val() === 'Send Confirmation Code') {

            $.ajax({
                type: 'POST',
                url: 'http://localhost:3000/sendCode',
                data: JSON.stringify(data),
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                error: function(error) {
                    alert(error.messages);
                },
                success: function(msg) {
                    console.log(msg);
                }
            });


            $('.confirmationCode-signup').css("display", "block");
            $(this).val('Create Account');

        } else {

            data.password = $('#signup-password').val();

            $('<form action="/users" method="POST">' +
                '<input type="hidden" name="phone" value="' + data.phone_number + '">' +
                '<input type="hidden" name="email" value="' + data.email + '">' +
                '<input type="hidden" name="password" value="' + data.password + '">' +
                '</form>').submit();

            // $.ajax({
            //     type: 'POST',
            //     url: 'http://localhost:3000/users',
            //     data: JSON.stringify(data),
            //     dataType: "json",
            //     contentType: "application/json; charset=utf-8",
            //     error: function(error) {
            //         alert(error.messages);
            //     },
            //     success: function(msg) {
            //         console.log(msg);
            //     }
            // });
        }
    });


    // Click Login button
    buttonLogin.click(function(e) {

        e.preventDefault();
        var data = {};
        data.phone_number = $('#signin-phone').val();

        if ($(this).val() === 'Send Confirmation Code') {

            $.ajax({
                type: 'POST',
                url: 'http://localhost:3000/sendCode',
                data: JSON.stringify(data),
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                error: function(error) {
                    alert(error.messages);
                },
                success: function(msg) {
                    console.log(msg);
                }
            });

            $('.confirmationCode-login').css("display", "block");
            $(this).val('Login');

        } else {

            data.password = $('#signin-password').val();

            $('<form action="/users/login" method="POST">' +
                '<input type="hidden" name="phone_number" value="' + data.phone_number + '">' +
                '<input type="hidden" name="password" value="' + data.password + '">' +
                '</form>').submit();

            // $.ajax({
            //     type: 'POST',
            //     url: 'http://localhost:3000/users/login',
            //     data: JSON.stringify(data),
            //     dataType: "json",
            //     contentType: "application/json; charset=utf-8",
            //     error: function(error) {
            //         alert(error.messages);
            //     },
            //     success: function(msg) {
            //         console.log(msg);
            //     }
            // });
        }
    });


    // //close modal
    // formModal.on('click', function(event) {
    //     if ($(event.target).is(formModal) || $(event.target).is('.cd-close-form')) {
    //         formModal.removeClass('is-visible');
    //     }
    // });

    // //close modal when clicking the esc keyboard button
    // $(document).keyup(function(event) {
    //     if (event.which == '27') {
    //         formModal.removeClass('is-visible');
    //     }
    // });

    //switch from a tab to another
    formModalTab.on('click', function(event) {
        event.preventDefault();
        ($(event.target).is(tabLogin)) ? login_selected(): signup_selected();
    });

    //hide or show password
    $('.hide-password').on('click', function() {
        var togglePass = $(this),
            passwordField = togglePass.prev('input');

        ('password' == passwordField.attr('type')) ? passwordField.attr('type', 'text'): passwordField.attr('type', 'password');
        ('Hide' == togglePass.text()) ? togglePass.text('Show'): togglePass.text('Hide');
        //focus and move cursor to the end of input field
        passwordField.putCursorAtEnd();
    });

    //show forgot-password form 
    forgotPasswordLink.on('click', function(event) {
        event.preventDefault();
        forgot_password_selected();
    });

    //back to login from the forgot-password form
    backToLoginLink.on('click', function(event) {
        event.preventDefault();
        login_selected();
    });


    function login_selected() {
        mainNav.children('ul').removeClass('is-visible');
        formModal.addClass('is-visible');
        formLogin.addClass('is-selected');
        formSignup.removeClass('is-selected');
        formForgotPassword.removeClass('is-selected');
        tabLogin.addClass('selected');
        tabSignup.removeClass('selected');
    }

    function signup_selected() {
        mainNav.children('ul').removeClass('is-visible');
        formModal.addClass('is-visible');
        formLogin.removeClass('is-selected');
        formSignup.addClass('is-selected');
        formForgotPassword.removeClass('is-selected');
        tabLogin.removeClass('selected');
        tabSignup.addClass('selected');
    }

    function forgot_password_selected() {
        formLogin.removeClass('is-selected');
        formSignup.removeClass('is-selected');
        formForgotPassword.addClass('is-selected');
    }

    //REMOVE THIS - it's just to show error messages 
    // formLogin.find('input[type="submit"]').on('click', function(event) {
    //     event.preventDefault();
    //     formLogin.find('input[type="email"]').toggleClass('has-error').next('span').toggleClass('is-visible');
    // });
    // formSignup.find('input[type="submit"]').on('click', function(event) {
    //     event.preventDefault();
    //     formSignup.find('input[type="email"]').toggleClass('has-error').next('span').toggleClass('is-visible');
    // });


    //IE9 placeholder fallback
    //credits http://www.hagenburger.net/BLOG/HTML5-Input-Placeholder-Fix-With-jQuery.html
    if (!Modernizr.input.placeholder) {
        $('[placeholder]').focus(function() {
            var input = $(this);
            if (input.val() == input.attr('placeholder')) {
                input.val('');
            }
        }).blur(function() {
            var input = $(this);
            if (input.val() == '' || input.val() == input.attr('placeholder')) {
                input.val(input.attr('placeholder'));
            }
        }).blur();
        $('[placeholder]').parents('form').submit(function() {
            $(this).find('[placeholder]').each(function() {
                var input = $(this);
                if (input.val() == input.attr('placeholder')) {
                    input.val('');
                }
            })
        });
    }
});


//credits http://css-tricks.com/snippets/jquery/move-cursor-to-end-of-textarea-or-input/
jQuery.fn.putCursorAtEnd = function() {
    return this.each(function() {
        // If this function exists...
        if (this.setSelectionRange) {
            // ... then use it (Doesn't work in IE)
            // Double the length because Opera is inconsistent about whether a carriage return is one character or two. Sigh.
            var len = $(this).val().length * 2;
            this.focus();
            this.setSelectionRange(len, len);
        } else {
            // ... otherwise replace the contents with itself
            // (Doesn't work in Google Chrome)
            $(this).val($(this).val());
        }
    });
};
