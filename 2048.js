(function($) {

function index_to_coordinates(index, settings) {
    return [(index[0] + 1) * settings.margin + index[0] * settings.size,
            (index[1] + 1) * settings.margin + index[1] * settings.size]
}

function index_is_valid(settings, index) {
    return index[0] >= 0
        && index[0] < settings.column
        && index[1] >= 0
        && index[1] < settings.row
}

function index_get_tile(index) {
    return $('.tile').filter(function() {
            return $(this).data('column_index') == index[0]
                && $(this).data('row_index') == index[1]
        })
}

function coordinates_to_index(coordinates_list, coordinates) {
    return [
        coordinates_get_columns(coordinates_list).indexOf(coordinates[1]),
        coordinates_get_rows(coordinates_list).indexOf(coordinates[0])]
}

function coordinates_get_rows(coordinates_list) {
    return _.reduce(
        coordinates_list,
        function(result, coordinates) {
            return _.union(result, [coordinates[0]])
        },
        [])
}

function coordinates_get_columns(coordinates_list) {
    return _.reduce(
        coordinates_list,
        function(result, coordinates) {
            return _.union(result, [coordinates[1]])
        },
        [])
}

function grid_get_coordinates(settings) {
    return _.reduce(
        _.range(settings.row),
        function(current, row_index) {
            return current.concat(
                $.map(
                    _.range(settings.column),
                    function(column_index) {
                        return [index_to_coordinates([column_index, row_index], settings)]
                    }))
        },
        [])
}

function grid_setup(settings, coordinates_list) {
    return $(document.createElement('div'))
        .addClass('base')
        .css('clear', 'both')
        .css('position', 'absolute')
        .css('z-index', -200)
        .css('width', settings.size * settings.column + (settings.column + 1) * settings.margin + 'px')
        .css('height', settings.size * settings.row + (settings.row + 1) * settings.margin + 'px')
        .append($.map(
            coordinates_list,
            function(coordinates) {
                return $(document.createElement('div'))
                    .addClass('grid')
                    .css('width', settings.size + 'px')
                    .css('height', settings.size + 'px')
                    .css('padding', 0)
                    .css('left', coordinates[0])
                    .css('top', coordinates[1])
                    .css('z-index', -100)
                    .css('position', 'absolute')
            }))
}

function index_get_random(settings) {
    var index = [_.sample(_.range(settings.row)), _.sample(_.range(settings.column))]

    return index_get_tile(index).length > 0 ?
        index_get_random(settings)
        : index;
}

function board_get_size(settings) {
    return [
        settings.size * settings.column + (settings.column + 1) * settings.margin,
        settings.size * settings.row + (settings.row + 1) * settings.margin]
}

function game_init(board, settings, tile_builder) {
    return $(document.createElement('div'))
        .appendTo(board)
        .addClass('play')
        .css('position', 'absolute')
        .css('z-index', 0)
        .css('width', _.first(board_get_size(settings)) + 'px')
        .css('height', _.last(board_get_size(settings)) + 'px')
        .append(tile_builder())
        .append(tile_builder())
}

function tile_get_builder(settings) {
    return function() {
        var value = _.sample([2, 4]),
            index = index_get_random(settings),
            coordinates = index_to_coordinates(index, settings)

        return $(document.createElement('div'))
            .append(
                $(document.createElement('span'))
                    .css('display', 'block')
                    .css('padding', '10px')
                    .css('margin', 0)
                    .text(value))
            .addClass('tile tile-' + value)
            .css('font-size', settings.size - 20 + 'px')
            .css('position', 'absolute')
            .css('left', coordinates[0])
            .css('top', coordinates[1])
            .css('z-index', 100)
            .css('width', settings.size + 'px')
            .css('height', settings.size + 'px')
            .css('padding', 0)
            .css('margin', 0)
            .css('line-height', 1)
            .css('text-align', 'center')
            .data('value', value)
            .data('column_index', index[0])
            .data('row_index', index[1])
    }
}

/**
 * group_by: group the result by column [0] or row [1]
 * sequence: define the sequence of evaluation
 */
function evaluation_get_sequence(group_by, sequence) {
    return _.map(
        sequence[0],
        function(first_index) {
            return _.filter(
                $.map(
                    sequence[1],
                    function(second_index) {
                        return index_get_tile([
                            group_by == 1 ? second_index : first_index,
                            group_by == 1 ? first_index : second_index
                        ])
                    }),
                function(item) {
                    return $(item).length > 0
                })
        })
}

function tile_cannot_be_merged(current, tile) {
    return current.length == 0
        || _.first(_.last(current))
        || _.last(_.last(current)).data('value') != tile.data('value')
}

function tile_reduce_merge(current, tile) {
    var result, value = tile.data('value')

    if(tile_cannot_be_merged(current, tile)) {
        result = current.concat([[false, tile]])
    } else {
        result = _.initial(current).concat([[true, tile]])

        tile.removeClass('tile-' + value)
            .addClass('tile-' + value * 2)
            .data('value', value * 2)
            .find('span')
            .text(value * 2)

        _.last(_.last(current))
            .css('z-index', 50)
            .fadeOut({
                duration: 100,
                complete: function() {
                    $(this).remove()
                }
            })
    }

    return result;
}

function vector_get_edge(settings, index, vector) {
    var result = [index[0] + vector[0], index[1] + vector[1]]

    return index_is_valid(settings, result) ?
        vector_get_edge(settings, result, vector)
        : index
}

function tile_get_index(tile) {
    return [tile.data('column_index'), tile.data('row_index')]
}

function tile_get_value(tile) {
    return parseInt(tile.data('value'))
}

function tile_mover_reducer(settings, vector) {
    return function(current, incoming) {
        var result, index_new;

        if(current.length == 0) {
            index_new = vector_get_edge(settings, tile_get_index(_.last(incoming)),vector)
        } else {
            index_new = [_.first(_.first(_.last(current))) - vector[0],
                            _.last(_.first(_.last(current))) - vector[1]]
        }

        result = current.concat([[index_new, _.last(incoming)]])

        _.last(incoming).data('column_index', index_new[0])
            .data('row_index', index_new[1])
            .animate({
                'left': _.first(index_to_coordinates(index_new, settings)),
                'top': _.last(index_to_coordinates(index_new, settings))
            },
            { duration: 100 })

        return result
    }
}

function game_get_state(tile_list) {
    return _.map(tile_list, function(tile) {
            return [tile.data('value'), tile_get_index(tile).join(',')].join(';')
        }).sort()
}

function state_is_unchanged(state_alpha, state_beta) {
    return state_alpha.length == state_beta.length
        && _.reduce(
            _.zip(state_alpha, state_beta),
            function(current, incoming) {
                return current && _.first(incoming) == _.last(incoming)
            },
            true)
}

function evaluate_next_phase(vector, settings, tile_group) {
    var state = game_get_state(_.flatten(tile_group)),
        tile_new = _.map(
            tile_group,
            function(tiles) {
                return _.map(
                    _.reduce(
                        _.reduce(tiles, tile_reduce_merge, []),
                        tile_mover_reducer(settings, vector),
                        [])
                , _.last)
            })

    if(state_is_unchanged(state, game_get_state(_.flatten(tile_new))) === false) {
        $('.play').append(
            tile_get_builder(settings)()
                .fadeIn({duration: 100}))

        highscore_update(_.flatten(tile_new))
    }
}

function footer_builder(settings, highscore_builder, reset_builder) {
    return $(document.createElement('div'))
        .addClass('header')
        .css('position', 'relative')
        .css('width', _.first(board_get_size(settings)) + 'px')
        .css('top', _.last(board_get_size(settings)) + 'px')
        .append(highscore_builder())
        .append(reset_builder())
}

function reset_get_builder(settings, reset_behaviour) {
    return function() {
        return $(document.createElement('div'))
            .addClass('reset')
            .css('float', 'right')
            .css('width', '33.3%')
            .append(
                $(document.createElement('a'))
                    .text('Reset')
                    .attr('href', '#')
                    .click(reset_behaviour))
    }
}

function reset_get_behaviour(settings, tile_builder) {
    return function(event) {
        $('.tile').remove()

        $('.play')
            .append(tile_builder())
            .append(tile_builder())

        highscore_update($('.tile'))

        return false
    }
}

function highscore_get_builder(settings) {
    return function() {
        return $(document.createElement('div'))
            .css('float', 'left')
            .css('width', '66.7%')
            .addClass('highscore')
            .append(
                $(document.createElement('p'))
                    .append(document.createTextNode('Highest-valued tile: '))
                    .append(document.createElement('span')))
    }
}

function highscore_update(tile_list) {
    $('.play').parent()
        .find('.highscore span')
        .text(_.max(_.map(_.map(tile_list, $), tile_get_value)))
}

function game_get_behavior(settings) {
    return function(event) {
        switch(event.which) {
            case 37: // left
            evaluate_next_phase(
                [-1, 0],
                settings,
                evaluation_get_sequence(
                    1,
                    [_.range(settings.row),
                    _.range(settings.column)]))
            break;

            case 38: // up
            evaluate_next_phase(
                [0, -1],
                settings,
                evaluation_get_sequence(
                    0,
                    [_.range(settings.column),
                    _.range(settings.row)]))
            break;

            case 39: // right
            evaluate_next_phase(
                [1, 0],
                settings,
                evaluation_get_sequence(
                    1,
                    [_.range(settings.row),
                    _.range(settings.column - 1, -1, -1)]))
            break;

            case 40: // down
            evaluate_next_phase(
                [0, 1],
                settings,
                evaluation_get_sequence(
                        0,
                        [_.range(settings.column),
                        _.range(settings.row - 1, -1, -1)]))
            break;

            default: return; // exit this handler for other keys
        }

        event.preventDefault();
    }
}

$.fn.game_2048 = function(options) {
    var settings = $.extend({
            row: 4,
            column: 4,
            size: 100,
            margin: 10,
        },
        options)

    game_init(
        $(this).append(grid_setup(settings, grid_get_coordinates(settings))),
        settings,
        tile_get_builder(settings))

    $(this).append(footer_builder(
                        settings,
                        highscore_get_builder(settings),
                        reset_get_builder(settings, reset_get_behaviour(settings, tile_get_builder(settings)))))

    highscore_update($('.tile'))

    $('body').keydown(game_get_behavior(settings))
}

})(jQuery)
