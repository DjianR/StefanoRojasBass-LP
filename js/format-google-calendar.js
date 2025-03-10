<<<<<<< HEAD
/**
 * Format Google Calendar JSON output into human readable list
 *
 * Copyright 2015, Milan Kacurak
 *
 */
var formatGoogleCalendar = (function() {

    'use strict';

    var config;

    //Gets JSON from Google Calendar and transfroms it into html list items and appends it to past or upcoming events list
    var init = function(settings) {
        var result = [];

        config = settings;

        //Get JSON, parse it, transform into list items and append it to past or upcoming events list
        jQuery.getJSON(settings.calendarUrl, function(data) {
            // Remove any cancelled events
            data.items.forEach(function removeCancelledEvents(item) {
                if (item && item.hasOwnProperty('status') && item.status !== 'cancelled') {
                    result.push(item);
                }
            });
            result.sort(comp).reverse();

            var pastCounter = 0,
                upcomingCounter = 0,
                pastResult = [],
                upcomingResult = [],
                upcomingResultTemp = [],
                $upcomingElem = jQuery(settings.upcomingSelector),
                $pastElem = jQuery(settings.pastSelector),
                i;

            if (settings.pastTopN === -1) {
                settings.pastTopN = result.length;
            }

            if (settings.upcomingTopN === -1) {
                settings.upcomingTopN = result.length;
            }

            if (settings.past === false) {
                settings.pastTopN = 0;
            }

            if (settings.upcoming === false) {
                settings.upcomingTopN = 0;
            }

            for (i in result) {
                // console.log(result);
                if (isPast(result[i].end.dateTime || result[i].end.date)) {
                    if (pastCounter < settings.pastTopN) {
                       pastResult.push(result[i]);
                       pastCounter++;
                    }
                } else {
                    upcomingResultTemp.push(result[i]);
                }
            }

            upcomingResultTemp.reverse();

            for (i in upcomingResultTemp) {
                if (upcomingCounter < settings.upcomingTopN) {
                    upcomingResult.push(upcomingResultTemp[i]);
                    upcomingCounter++;
                }
            }

            for (i in pastResult) {
                $pastElem.append(transformationList(pastResult[i], settings.itemsTagName, settings.format));
            }

            for (i in upcomingResult) {
                $upcomingElem.append(transformationList(upcomingResult[i], settings.itemsTagName, settings.format));
            }

            if ($upcomingElem.children().length !== 0) {
                jQuery(settings.upcomingHeading).insertBefore($upcomingElem);
            }

            if ($pastElem.children().length !== 0) {
                jQuery(settings.pastHeading).insertBefore($pastElem);
            }

        });
    };

    //Compare dates
    var comp = function(a, b) {
        return new Date(a.start.dateTime || a.start.date).getTime() - new Date(b.start.dateTime || b.start.date).getTime();
    };

    //Overwrites defaultSettings values with overrideSettings and adds overrideSettings if non existent in defaultSettings
    var mergeOptions = function(defaultSettings, overrideSettings){
        var newObject = {},
            i;
        for (i in defaultSettings) {
            newObject[i] = defaultSettings[i];
        }
        for (i in overrideSettings) {
            newObject[i] = overrideSettings[i];
        }
        return newObject;
    };

    //Get all necessary data (dates, location, summary, description) and creates a list item
    var transformationList = function(result, tagName, format) {
        var dateStart = getDateInfo(result.start.dateTime || result.start.date),
            dateEnd = getDateInfo(result.end.dateTime || result.end.date),
            dateFormatted = getFormattedDate(dateStart, dateEnd),
            output = '<' + tagName + '>',
            summary = result.summary || '',
            day = dateStart[0],
            month = getMonthName(dateStart[1]) ,
            hour = dateStart[3] + ':' + dateStart[4]+(dateStart[4]==0?'0':''),
            description = result.description || ' ',
            location = result.location || '',
            addEventLink = getAddEventLink(result.htmlLink, result.organizer.email, result.summary, result.start.dateTime, result.description, result.location) || '',
            
            i;
        console.log(result);
        for (i = 0; i < format.length; i++) {

            format[i] = format[i].toString();

            if (format[i] === '*summary*') {
                output = output.concat('<strong> <span class="summary">' + summary.toUpperCase() + '</span> </strong>');
            } else if (format[i] === '*date*') {
                output = output.concat('<span class="date">' + dateFormatted + '</span>');
            } else if (format[i] === '*day*') {
                output = output.concat('<span class="day">' + day + '</span>');
            } else if (format[i] === '*month*') {
                output = output.concat('<span class="month">' + month + '</span>');
            } else if (format[i] === '*hour*') {
                output = output.concat('<span class="hour">' + hour + '</span>');
            } else if (format[i] === '*description*') {
                output = output.concat('<span class="description">' +  description + '</span>');
            } else if (format[i] === '*location*') {
                output = output.concat('<em><span class="location">' + location + '</span></em>');
            } else if (format[i] === '*addEventLink*') {
                output = output.concat(addEventLink);
            }
            else {
                if ((format[i + 1] === '*location*' && location !== '') ||
                    (format[i + 1] === '*summary*' && summary !== '') ||
                    (format[i + 1] === '*date*' && dateFormatted !== '') ||
                    (format[i + 1] === '*day*' && day !== '') ||
                    (format[i + 1] === '*month*' && month !== '') ||
                    (format[i + 1] === '*hour*' && hour !== '') ||
                    (format[i + 1] === '*description*' && description !== '') ||
                    (format[i + 1] === '*addEventLink*' && addEventLink !== '') ) {

                    output = output.concat(format[i]);
                }
            }
        }

        return output ;
    };

    var getAddEventLink = function (eventLink, organizerEmail, summary, dateTime, details, location){
        var linkPrefix = 'https://calendar.google.com/calendar/event?action=TEMPLATE'
        // var tmeid = '&tmeid=' + (eventLink.split('?eid='))[1];
        // var tmsrc = '&tmsrc=' + organizerEmail;
        // var linkSuffix = '&catt=false&pprop=HowCreated:DUPLICATE&hl=es-419&scp=ONE'
        
        // var addEventLink = linkPrefix + tmeid + tmsrc + linkSuffix;
        var title = '&text='+summary.replace(/ /g, '%20');
        var date = '&dates=' + getUTCTime(dateTime);
        var description = details?'&details='+ details.replace(/ /g, '%20'): ''
        var geo = '&location=' + location.replace(/ /g, '+');
        var linkSuffix = '&sf=true&output=xml&ctz=America%2FSantiago'

        var addEventLink = linkPrefix + title + date + description + geo + linkSuffix;

         console.log('la hora del evento: ' + getDateInfo(dateTime));
        // console.log(getUTCTime(dateTime));
        // console.log("link de evento");
        // console.log(addEventLink);
        return addEventLink;
    }

    var getUTCTime = function(date){
        let [day, month, year, hour, minutes] = [...getDateInfo(date)];
        if (day.toString().length<2){
            day = '0'+ day.toString();
        }
        if (month.toString().length<2){
            console.log('mes:' + month);
            month = '0'+month.toString();
        }
        if (hour.toString().length<2){
            hour = '0'+hour.toString();
        }
        if (minutes.toString().length<2){
            minutes = '0'+minutes.toString();
        }
        var hour2 = hour + 1;
        let startHour = (year.toString()+month.toString()+day.toString()+'T'+hour+minutes+'00');
        let endHour = (year.toString()+month.toString()+day.toString()+'T'+hour2+minutes+'00');

        return startHour+'CL/'+endHour+'CL';

    }
    //Check if date is later then now
    var isPast = function(date) {
        var compareDate = new Date(date),
            now = new Date();

        if (now.getTime() > compareDate.getTime()) {
            return true;
        }

        return false;
    };

    //Get temp array with information abou day in followin format: [day number, month number, year]
    var getDateInfo = function(date) {
        date = new Date(date);
        return [date.getDate(), date.getMonth(), date.getFullYear(), date.getHours(), date.getMinutes()];
    };

    //Get month name according to index
    var getMonthName = function(month) {
        var monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Augosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        return monthNames[month];
    };

    //Transformations for formatting date into human readable format
    var formatDateSameDay = function(dateStart, dateEnd) {
        var formattedTime = '';

        if (config.sameDayTimes) {
            formattedTime = ' desde ' + getFormattedTime(dateStart) + ' - ' + getFormattedTime(dateEnd);
        }

        //month day, year time-time
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + ', ' + dateStart[2] + formattedTime;
    };

    var formatDateDifferentDay = function(dateStart, dateEnd) {
        //month day-day, year
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + '-' + dateEnd[0] + ', ' + dateStart[2];
    };

    var formatDateDifferentMonth = function(dateStart, dateEnd) {
        //month day - month day, year
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + '-' + getMonthName(dateEnd[1]) + ' ' + dateEnd[0] + ', ' + dateStart[2];
    };

    var formatDateDifferentYear = function(dateStart, dateEnd) {
        //month day, year - month day, year
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + ', ' + dateStart[2] + '-' + getMonthName(dateEnd[1]) + ' ' + dateEnd[0] + ', ' + dateEnd[2];
    };

    //Check differences between dates and format them
    var getFormattedDate = function(dateStart, dateEnd) {
        var formattedDate = '';

        if (dateStart[0] === dateEnd[0]) {
            if (dateStart[1] === dateEnd[1]) {
                if (dateStart[2] === dateEnd[2]) {
                    //month day, year
                    formattedDate = formatDateSameDay(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            } else {
                if (dateStart[2] === dateEnd[2]) {
                    //month day - month day, year
                    formattedDate = formatDateDifferentMonth(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            }
        } else {
            if (dateStart[1] === dateEnd[1]) {
                if (dateStart[2] === dateEnd[2]) {
                    //month day-day, year
                    formattedDate = formatDateDifferentDay(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            } else {
                if (dateStart[2] === dateEnd[2]) {
                    //month day - month day, year
                    formattedDate = formatDateDifferentMonth(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            }
        }

        return formattedDate;
    };

    var getFormattedTime = function (date) {
        var formattedTime = '',
            period = 'AM',
            hour = date[3],
            minute = date[4];

        // Handle afternoon.
        if (hour >= 12) {
            period = 'PM';

            if (hour >= 13) {
                hour -= 12;
            }
        }

        // Handle midnight.
        if (hour === 0) {
            hour = 12;
        }

        // Ensure 2-digit minute value.
        minute = (minute < 10 ? '0' : '') + minute;

        // Format time.
        formattedTime = hour + ':' + minute + period;
        return formattedTime;
    };

    return {
        init: function (settingsOverride) {
            var settings = {
                calendarUrl: 'https://www.googleapis.com/calendar/v3/calendars/milan.kacurak@gmail.com/events?key=AIzaSyCR3-ptjHE-_douJsn8o20oRwkxt-zHStY',
                past: true,
                upcoming: true,
                sameDayTimes: true,
                pastTopN: -1,
                upcomingTopN: -1,
                itemsTagName: 'div class="box-event"',
                upcomingSelector: '#events-upcoming',
                pastSelector: '#events-past',
                upcomingHeading: '<h2>Upcoming events</h2>',
                pastHeading: '<h2>Past events</h2>',
                format: ['*date*', ': ', '*summary*', ' &mdash; ', '*description*', ' in ', '*location*']
            };

            settings = mergeOptions(settings, settingsOverride);

            init(settings);
        }
    };
})();
=======
/**
 * Format Google Calendar JSON output into human readable list
 *
 * Copyright 2015, Milan Kacurak
 *
 */
var formatGoogleCalendar = (function() {

    'use strict';

    var config;

    //Gets JSON from Google Calendar and transfroms it into html list items and appends it to past or upcoming events list
    var init = function(settings) {
        var result = [];

        config = settings;

        //Get JSON, parse it, transform into list items and append it to past or upcoming events list
        jQuery.getJSON(settings.calendarUrl, function(data) {
            // Remove any cancelled events
            data.items.forEach(function removeCancelledEvents(item) {
                if (item && item.hasOwnProperty('status') && item.status !== 'cancelled') {
                    result.push(item);
                }
            });

            result.sort(comp).reverse();

            var pastCounter = 0,
                upcomingCounter = 0,
                pastResult = [],
                upcomingResult = [],
                upcomingResultTemp = [],
                $upcomingElem = jQuery(settings.upcomingSelector),
                $pastElem = jQuery(settings.pastSelector),
                i;

            if (settings.pastTopN === -1) {
                settings.pastTopN = result.length;
            }

            if (settings.upcomingTopN === -1) {
                settings.upcomingTopN = result.length;
            }

            if (settings.past === false) {
                settings.pastTopN = 0;
            }

            if (settings.upcoming === false) {
                settings.upcomingTopN = 0;
            }

            for (i in result) {
                // console.log(result);
                if (isPast(result[i].end.dateTime || result[i].end.date)) {
                    if (pastCounter < settings.pastTopN) {
                       pastResult.push(result[i]);
                       pastCounter++;
                    }
                } else {
                    upcomingResultTemp.push(result[i]);
                }
            }

            upcomingResultTemp.reverse();

            for (i in upcomingResultTemp) {
                if (upcomingCounter < settings.upcomingTopN) {
                    upcomingResult.push(upcomingResultTemp[i]);
                    upcomingCounter++;
                }
            }

            for (i in pastResult) {
                $pastElem.append(transformationList(pastResult[i], settings.itemsTagName, settings.format));
            }

            for (i in upcomingResult) {
                $upcomingElem.append(transformationList(upcomingResult[i], settings.itemsTagName, settings.format));
            }

            if ($upcomingElem.children().length !== 0) {
                jQuery(settings.upcomingHeading).insertBefore($upcomingElem);
            }

            if ($pastElem.children().length !== 0) {
                jQuery(settings.pastHeading).insertBefore($pastElem);
            }

        });
    };

    //Compare dates
    var comp = function(a, b) {
        return new Date(a.start.dateTime || a.start.date).getTime() - new Date(b.start.dateTime || b.start.date).getTime();
    };

    //Overwrites defaultSettings values with overrideSettings and adds overrideSettings if non existent in defaultSettings
    var mergeOptions = function(defaultSettings, overrideSettings){
        var newObject = {},
            i;
        for (i in defaultSettings) {
            newObject[i] = defaultSettings[i];
        }
        for (i in overrideSettings) {
            newObject[i] = overrideSettings[i];
        }
        return newObject;
    };

    //Get all necessary data (dates, location, summary, description) and creates a list item
    var transformationList = function(result, tagName, format) {
        var dateStart = getDateInfo(result.start.dateTime || result.start.date),
            dateEnd = getDateInfo(result.end.dateTime || result.end.date),
            dateFormatted = getFormattedDate(dateStart, dateEnd),
            output = '<' + tagName + '>',
            summary = result.summary || '',
            day = dateStart[0],
            month = getMonthName(dateStart[1]) ,
            hour = dateStart[3] + ':' + dateStart[4]+(dateStart[4]==0?'0':''),
            description = result.description || '',
            location = result.location || '',
            addEventLink = getAddEventLink(result.htmlLink, result.organizer.email, result.summary, result.start.dateTime, result.description, result.location) || '',

            i;
        
        for (i = 0; i < format.length; i++) {

            format[i] = format[i].toString();

            if (format[i] === '*summary*') {
                output = output.concat('<strong> <span class="summary">' + summary.toUpperCase() + '</span> </strong>');
            } else if (format[i] === '*date*') {
                output = output.concat('<span class="date">' + dateFormatted + '</span>');
            } else if (format[i] === '*day*') {
                output = output.concat('<span class="day">' + day + '</span>');
            } else if (format[i] === '*month*') {
                output = output.concat('<span class="month">' + month + '</span>');
            } else if (format[i] === '*hour*') {
                output = output.concat('<span class="hour">' + hour + '</span>');
            } else if (format[i] === '*description*') {
                output = output.concat('<span class="description">' +  description + '</span>');
            } else if (format[i] === '*location*') {
                output = output.concat('<em><span class="location">' + location + '</span></em>');
            } else if (format[i] === '*addEventLink*') {
                output = output.concat(addEventLink);
            }
            else {
                if ((format[i + 1] === '*location*' && location !== '') ||
                    (format[i + 1] === '*summary*' && summary !== '') ||
                    (format[i + 1] === '*date*' && dateFormatted !== '') ||
                    (format[i + 1] === '*day*' && day !== '') ||
                    (format[i + 1] === '*month*' && month !== '') ||
                    (format[i + 1] === '*hour*' && hour !== '') ||
                    (format[i + 1] === '*description*' && description !== '') ||
                    (format[i + 1] === '*addEventLink*' && addEventLink !== '') ) {

                    output = output.concat(format[i]);
                }
            }
        }

        return output ;
    };

    var getAddEventLink = function (eventLink, organizerEmail, summary, dateTime, details, location){
        var linkPrefix = 'https://calendar.google.com/calendar/event?action=TEMPLATE'
        // var tmeid = '&tmeid=' + (eventLink.split('?eid='))[1];
        // var tmsrc = '&tmsrc=' + organizerEmail;
        // var linkSuffix = '&catt=false&pprop=HowCreated:DUPLICATE&hl=es-419&scp=ONE'
        
        // var addEventLink = linkPrefix + tmeid + tmsrc + linkSuffix;
        var title = '&text='+summary.replace(/ /g, '%20');
        var date = '&dates=' + getUTCTime(dateTime);
        var description = '&details='+ details.replace(/ /g, '%20');
        var geo = '&location=' + location.replace(/ /g, '+');
        var linkSuffix = '&sf=true&output=xml&ctz=America%2FSantiago'

        var addEventLink = linkPrefix + title + date + description + geo + linkSuffix;

        // console.log('la hora del evento: ' + getDateInfo(dateTime));
        // console.log(getUTCTime(dateTime));
        // console.log("link de evento");
        // console.log(addEventLink);
        return addEventLink;
    }

    var getUTCTime = function(date){
        let [day, month, year, hour, minutes] = [...getDateInfo(date)];
        if (day.toString().length<2){
            day = '0'+ day.toString();
        }
        if (month.toString().length<2){
            console.log('mes:' + month);
            month = '0'+month.toString();
        }
        if (hour.toString().length<2){
            hour = '0'+hour.toString();
        }
        if (minutes.toString().length<2){
            minutes = '0'+minutes.toString();
        }
        var hour2 = hour + 1;
        let startHour = (year.toString()+month.toString()+day.toString()+'T'+hour+minutes+'00');
        let endHour = (year.toString()+month.toString()+day.toString()+'T'+hour2+minutes+'00');

        return startHour+'CL/'+endHour+'CL';

    }
    //Check if date is later then now
    var isPast = function(date) {
        var compareDate = new Date(date),
            now = new Date();

        if (now.getTime() > compareDate.getTime()) {
            return true;
        }

        return false;
    };

    //Get temp array with information abou day in followin format: [day number, month number, year]
    var getDateInfo = function(date) {
        date = new Date(date);
        return [date.getDate(), date.getMonth(), date.getFullYear(), date.getHours(), date.getMinutes()];
    };

    //Get month name according to index
    var getMonthName = function(month) {
        var monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Augosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        return monthNames[month];
    };

    //Transformations for formatting date into human readable format
    var formatDateSameDay = function(dateStart, dateEnd) {
        var formattedTime = '';

        if (config.sameDayTimes) {
            formattedTime = ' desde ' + getFormattedTime(dateStart) + ' - ' + getFormattedTime(dateEnd);
        }

        //month day, year time-time
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + ', ' + dateStart[2] + formattedTime;
    };

    var formatDateDifferentDay = function(dateStart, dateEnd) {
        //month day-day, year
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + '-' + dateEnd[0] + ', ' + dateStart[2];
    };

    var formatDateDifferentMonth = function(dateStart, dateEnd) {
        //month day - month day, year
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + '-' + getMonthName(dateEnd[1]) + ' ' + dateEnd[0] + ', ' + dateStart[2];
    };

    var formatDateDifferentYear = function(dateStart, dateEnd) {
        //month day, year - month day, year
        return getMonthName(dateStart[1]) + ' ' + dateStart[0] + ', ' + dateStart[2] + '-' + getMonthName(dateEnd[1]) + ' ' + dateEnd[0] + ', ' + dateEnd[2];
    };

    //Check differences between dates and format them
    var getFormattedDate = function(dateStart, dateEnd) {
        var formattedDate = '';

        if (dateStart[0] === dateEnd[0]) {
            if (dateStart[1] === dateEnd[1]) {
                if (dateStart[2] === dateEnd[2]) {
                    //month day, year
                    formattedDate = formatDateSameDay(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            } else {
                if (dateStart[2] === dateEnd[2]) {
                    //month day - month day, year
                    formattedDate = formatDateDifferentMonth(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            }
        } else {
            if (dateStart[1] === dateEnd[1]) {
                if (dateStart[2] === dateEnd[2]) {
                    //month day-day, year
                    formattedDate = formatDateDifferentDay(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            } else {
                if (dateStart[2] === dateEnd[2]) {
                    //month day - month day, year
                    formattedDate = formatDateDifferentMonth(dateStart, dateEnd);
                } else {
                    //month day, year - month day, year
                    formattedDate = formatDateDifferentYear(dateStart, dateEnd);
                }
            }
        }

        return formattedDate;
    };

    var getFormattedTime = function (date) {
        var formattedTime = '',
            period = 'AM',
            hour = date[3],
            minute = date[4];

        // Handle afternoon.
        if (hour >= 12) {
            period = 'PM';

            if (hour >= 13) {
                hour -= 12;
            }
        }

        // Handle midnight.
        if (hour === 0) {
            hour = 12;
        }

        // Ensure 2-digit minute value.
        minute = (minute < 10 ? '0' : '') + minute;

        // Format time.
        formattedTime = hour + ':' + minute + period;
        return formattedTime;
    };

    return {
        init: function (settingsOverride) {
            var settings = {
                calendarUrl: 'https://www.googleapis.com/calendar/v3/calendars/milan.kacurak@gmail.com/events?key=AIzaSyCR3-ptjHE-_douJsn8o20oRwkxt-zHStY',
                past: true,
                upcoming: true,
                sameDayTimes: true,
                pastTopN: -1,
                upcomingTopN: -1,
                // itemsTagName: 'li',
                upcomingSelector: '#events-upcoming',
                pastSelector: '#events-past',
                upcomingHeading: '<h2>Upcoming events</h2>',
                pastHeading: '<h2>Past events</h2>',
                format: ['*date*', ': ', '*summary*', ' &mdash; ', '*description*', ' in ', '*location*']
            };

            settings = mergeOptions(settings, settingsOverride);

            init(settings);
        }
    };
})();
>>>>>>> Cambio-textos
