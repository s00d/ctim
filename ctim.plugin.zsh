#
# ctim-autocompletion-zsh
#
# Autocompletion for your ctim commands
#
# Copyright(c) 2023 Your Name
# MIT Licensed
#

#
# Your Name
# Github: https://github.com/yourgithub
# Twitter: https://twitter.com/yourtwitter
#

#
# Grabs all available commands from the output of `ctim -h`.
#
_ctim_commands() {
    local cur prev
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Parse the list of commands from `ctim -h`
    local commands=$(ctim -h | awk '/COMMANDS/,0' | awk 'NF{print $1}' | grep -v "COMMANDS" | grep -v "Use" | sort | uniq)

    if [[ ${prev} == "ctim" ]] ; then
        COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
        return 0
    fi

    # If the previous word is a command, parse its options
    if [[ ${commands} =~ ${prev} ]] ; then
        local options=$(ctim ${prev} -h | awk '/OPTIONS/,0' | awk 'NF{print $1}' | grep "^--" | cut -d'=' -f1 | sort | uniq)
        options=$(printf "%s= " ${options})
        COMPREPLY=( $(compgen -W "${options}" -- ${cur}) )
        return 0
    fi

    # If the previous word is an option, parse its possible values
    local possible_values=$(ctim ${COMP_WORDS[COMP_CWORD-2]} -h | awk '/OPTIONS/,0' | awk 'NF{print $1}' | grep "^${prev}" | grep -o '<[^>]*>' | tr -d '<>' | tr '|' ' '| sort | uniq)
    if [[ -n ${possible_values} ]] ; then
        COMPREPLY=( $(compgen -W "${possible_values}" -- ${cur}) )
        return 0
    fi
}

complete -F _ctim_commands ctim
