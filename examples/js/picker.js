charset = 'utf-8';
/*
 * picker.js
 * ios风格多列选择功能组件，如日期、通讯录、省市区等
 * */
;
(function ($) {
    'use strict';

    var Picker = function (options) {
        var self = this;
        var defaults = {
            cols: [], //列
            inputReadOnly: true, //input是否只读
            toolbar: true,
            toolbarCloseText: '确定',  //关闭按钮文案
            toolbarTemplate: [
                '<header class="bar bar-nav">',
                '<button class="button button-link pull-right close-picker">确定</button>',
                '<h1 class="title">请选择</h1>',
                '</header>'
            ].join('')
        };

        /*参数*/
        self.params = $.extend({}, defaults, options);  //console.log(self.params)

        self.initialized = false; //初始化过
        self.support = (function () {
           return {
               touch: !!('ontouchstart' in window)     //是否支持touch
           }
        })();
        /*当前状态支持的事件*/
        self.events = {
            start: self.support.touch ? 'touchstart' : 'mousedown',
            move: self.support.touch ? 'touchmove' : 'mousemove',
            end: self.support.touch ? 'touchend' : 'mouseup'
        };

        /*页面元素*/
        var elements = {
            modal: $('.picker-modal'),   //modal container
            input: $(self.params.input), //input
            container: $('.picker-items')  //items container
        };

        /*method*/
        self.init = function () {
            self.layout();

            self.initCols();
        };

        /*关闭模态框*/
        self.close = function () {
            elements.modal.addClass('modal-out').removeClass('modal-in');
        };

        /*设置布局，选项等*/
        self.layout = function () {
            self.initialized = true;
            self.setItems();
        };

        self.setItems = function () {
            if (self.params.cols.length) {
                var arr = ['<div class="picker-center-highlight"></div>'];
                $.each(self.params.cols, function (i, v) {
                    arr.push('<div class="picker-items-col"><div class="picker-items-col-wrapper">');
                    $.each(v.values, function (m, n) {
                        arr.push('<div class="picker-item">' + n + '</div>');
                    });
                    arr.push('</div></div>');
                });
                elements.container.empty().append(arr.join(''));
            }

        };

        self.initCols = function () {
            $.each(elements.container.find('.picker-items-col'), function () {
                var col = $(this), colIndex = col.index();

                col.wrapper = col.find('.picker-items-col-wrapper');
                col.items = col.find('.picker-item');


                /*绑定事件*/
                col.on(self.events.start, fnTouchStart);
                col.on(self.events.move, fnTouchMove);
                col.on(self.events.end, fnTouchEnd);



                /*
                 * 备注：
                 * touches是当前屏幕上所有触摸点的列表;
                 * targetTouches是当前对象上所有触摸点的列表;
                 * changedTouches是涉及当前事件的触摸点的列表。
                 * */
                var isTouched, isMoved, startY, currentY, movedY,startTranslate,currentTranslate;
                var minTranslate,maxTranslate;
                /*touch satrt*/
                function fnTouchStart(e) {
                    if (isMoved || isTouched) return false;
                    e.preventDefault();
                    isTouched = true;
                    startY = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;
                    console.log('startY',startY)
                    startTranslate = fnGetTranslate(col.wrapper[0], 'y');
                    console.log('startTranslate',typeof startTranslate, startTranslate)
                }

                /*touch move*/
                function fnTouchMove(e) {
                    if(!isTouched) return false;
                    e.preventDefault();
                    isTouched = true;

                    currentY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;
                    movedY = currentY - startY;

                    currentTranslate = startTranslate + movedY;

                    console.log('currentTranslate',currentTranslate)

                    //滑动
                    fnTranslate(col.wrapper,currentTranslate,200);

                }

                /*touch end*/
                function fnTouchEnd(e) {
                    isTouched = isMoved = false;
                }

            });
        };

        /*打开模态框*/
        self.open = function () {
            elements.modal.addClass('modal-in').removeClass('modal-out');
        };

        /*update scroll position*/
        function fnUpdateDuringScroll() {

        }



        /*
         * Function fnTransition
         * 过渡
         * */
        function fnTransition(ele, duration) {
            var _style = 'all ' + (duration || 0) + 'ms linear';
            ele.css({
                '-webkit-transition': _style,
                'transition': _style
            });
        }

        /*
         * Function fnTranslate
         * 偏移
         * */
        function fnTranslate(ele, offset, duration) {
            var _style = 'translate3d(0,' + (offset || 0) + 'px,0)';
            ele.css({
                '-webkit-transform': _style,
                'transform': _style
            });
            fnTransition(ele, duration);
        }


        /*
        * 获取偏移量
        * */
        function fnGetTranslate(ele, direction){
            if(typeof direction === 'undefined') direction = 'x';

            var currTransform, curStyle = window.getComputedStyle(ele, null); //不同的浏览器估计会有不同的处理方式,此处留坑。。。
            /*
            * curStyle.transform
            * 设置  -webkit-transform: translate3d(10px,-100px,-5px);
            * 得到矩阵字符串 matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, -100, -5, 1)
            * 设置  -webkit-transform: translate3d(0,-100px,0);
            * 得到矩阵字符串 matrix(1, 0, 0, 1, 0, -100)
            * */
            var transformMatrix = curStyle.transform === 'none' ? '' : curStyle.transform;
            console.log('transformMatrix',transformMatrix);

            var matrixArr = transformMatrix.split(',')
            if(direction === 'x'){
                currTransform = matrixArr.length === 16 ? matrixArr[12] : matrixArr[4]
            }else if(direction === 'y'){
                currTransform = matrixArr.length === 16 ? matrixArr[13] : matrixArr[5]
            }

            return parseFloat(currTransform) || 0;
        }



        /*fun: fnOnHtmlClick*/
        function fnOnHtmlClick(e) {
            if (elements.modal[0]) {
                if (e.target != elements.input[0] && !$(e.target).closest('.picker-modal')[0]) self.close();
            }
        }

        /*bind events*/
        $(document.body).on('click', '.close-picker', function () {
            self.close();
        }).on('click', fnOnHtmlClick);

        elements.input.on('focus', function () {
            self.open();
        });

        if (!self.initialized) self.init();

    };


    $.fn.picker = function (options) {
        var args = arguments;
        return this.each(function () {
            if (!this) return;
            var $this = $(this);

            var picker = $this.data("picker");
            if (!picker) {
                var params = $.extend({
                    input: this,
                    value: $this.val() ? $this.val().split(' ') : ''
                }, options);
                picker = new Picker(params);
                $this.data("picker", picker);
            }
            if (typeof options === 'string') {
                picker[options].apply(picker, Array.prototype.slice.call(args, 1));
            }
        });
    };
})(Zepto);


/*datetimePicker*/
;
(function ($) {
    "use strict";

    var M = {
        today: new Date(),
        formatNum: function (val) {
            return (val && val < 10) ? '0' + val : '' + val;
        },
        makeArr: function (max, min) {
            var arr = [];
            for (var i = min || 1; i <= max; i++) {
                arr.push(M.formatNum(i));
            }
            return arr;
        },
        getDaysByYearAndMonth: function (year, month) {
            var max = new Date(new Date(year, month, 1) - 1).getDate();
            return M.makeArr(max);
        },
        formatDate: function (values, format) {
            for (var i = 0; i < values.length; i++) {
                values[i] = M.formatNum(values[i]);
            }
            var o = {
                "y+": values[0] || M.today.getFullYear(), //year
                "M+": values[1] || M.today.getMonth() + 1, //month
                "d+": values[2] || M.today.getDate(), //day
                "h+": values[3] || M.today.getHours(), //hour
                "m+": values[4] || M.today.getMinutes(), //minute
                "s+": values[5] || M.today.getSeconds() //second
            };

            for (var k in o) {
                if (new RegExp("(" + k + ")").test(format)) {
                    if ("y+" === k) {
                        format = format.replace(RegExp.$1, (o[k] + "").substr(4 - RegExp.$1.length));
                    } else {
                        format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
                    }
                }
            }
            return format;
        },
    };

    /*默认参数*/
    var defaults = {
        format: 'yyyy-MM-dd hh:mm', //日期字符串格式
        value: [],  //默认值，如：['2015', '12', '29', '19', '15']
        yearLimit: [1950, 2030], //年份范围
        onChange: function (picker) {
            var days = M.getDaysByYearAndMonth(picker[0], picker[1]);
            if (picker[2] > days.length)  picker[2] = days.length;
        }
    };
    /*需要显示的列数*/
    defaults.cols = [
        {
            /*年份范围*/
            values: M.makeArr(defaults.yearLimit[1], defaults.yearLimit[0])
        },
        {
            /*1-12月份*/
            values: M.makeArr(12)
        },
        {
            /*1-31日*/
            values: M.makeArr(31)
        },
        {
            /*24时*/
            values: M.makeArr(24)
        },
        {
            /*60分*/
            values: M.makeArr(60)
        },
        {
            /*60秒*/
            values: M.makeArr(60)
        }
    ];


    /*plugin*/
    $.fn.datetimePicker = function (options) {
        return this.each(function () {
            if (!this) return;
            var params = $.extend({}, defaults, options);
            //console.log(JSON.stringify(params))
            if (options.value) $(this).val(M.formatDate(params.value, params.format));
            $(this).picker(params);
        });
    };


})(Zepto);